// src/app/api/captcha/verify/route.ts
import { NextResponse } from "next/server";
import { extractIpUa } from "@/lib/auth/utils";
import { ACTION_SCOPES, verifyAndParseState, getDifficultyFor, type CaptchaAction } from "@/lib/captcha/state";
import { issueHPT } from "@/lib/captcha/hpt";
import crypto from "crypto";

// base64url без padding -> Buffer
function b64urlToBuf(s: string): Buffer {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}
function hexToBuf(h: string): Buffer {
  return Buffer.from(h, "hex");
}
function leadingZeroBits(buf: Buffer): number {
  let c = 0;
  for (const b of buf.values()) {
    if (b === 0) { c += 8; continue; }
    for (let k = 7; k >= 0; k--) {
      if (((b >> k) & 1) === 0) c++; else return c;
    }
  }
  return c;
}

// (в идеале импортировать из state.ts)
// временный fallback, если нет getDifficultyFor:
function serverRequiredDifficultyFor(action: CaptchaAction): number {
  // подстрой под свои реальные политики:
  switch (action) {
    case "login": return 20;
    case "register": return 22;
    case "resend": return 20;
    case "forgot": return 20;
    case "reset": return 20;
    default: return 20;
  }
}

export async function POST(request: Request) {
  try {
    const { action, state, pow } = (await request.json()) as {
      action?: CaptchaAction;
      state?: string; // base64url (без padding)
      pow?: { nonceHex?: string; nonce?: string; hashHex?: string; difficulty?: number };
    };

    if (!action || !state || !pow) {
      const res = NextResponse.json({ message: "bad_request", reason: "missing_fields" }, { status: 400 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // 1) Нормализуем nonce (строго 8 байт)
    let nonceHex = (pow.nonceHex || "").toLowerCase();

    if (!nonceHex && pow.nonce) {
      // legacy: может прийти hex или base64/base64url
      const legacy = pow.nonce;
      const isHex = /^[0-9a-f]+$/i.test(legacy);
      try {
        if (isHex && legacy.length % 2 === 0) {
          nonceHex = legacy.toLowerCase();
        } else {
          const pad = legacy.length % 4 === 2 ? "==" : legacy.length % 4 === 3 ? "=" : "";
          const b64 = legacy.replace(/-/g, "+").replace(/_/g, "/") + pad;
          nonceHex = Buffer.from(b64, "base64").toString("hex").toLowerCase();
        }
      } catch {
        // упадём ниже на bad_nonce
      }
    }

    if (!nonceHex || !/^[0-9a-f]{16}$/i.test(nonceHex)) {
      const res = NextResponse.json({ message: "bad_request", reason: "bad_nonce" }, { status: 400 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const { ip, ua } = extractIpUa(request);

    // 2) verify state (подпись, TTL, UA/IP)
    // + мягкий запас TTL для Dev/HMR
    const vr = verifyAndParseState(state, { action, ip, ua, maxAgeSec: 300 });
    if (!vr.ok) {
      const res = NextResponse.json({ message: "invalid_state" }, { status: 400 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // 3) Подсчитываем PoW по серверной формуле
    const stateBytes = b64urlToBuf(state);
    const nonceBytes = hexToBuf(nonceHex);
    const digest = crypto.createHash("sha256").update(Buffer.concat([stateBytes, nonceBytes])).digest();

    const zeros = leadingZeroBits(digest);

    // Требование сложности — ТОЛЬКО серверное
    // const required = getDifficultyFor ? getDifficultyFor(action) : serverRequiredDifficultyFor(action);
    const required = getDifficultyFor(action, { ua, ip });
    if (zeros < required) {
      const res = NextResponse.json({ message: "pow_too_weak", zeros, need: required }, { status: 400 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // (опц.) если клиент прислал hashHex — сверим для диагностики
    if (pow.hashHex) {
      const want = String(pow.hashHex).toLowerCase();
      const got = digest.toString("hex");
      if (want !== got) {
        const res = NextResponse.json({ message: "hash_mismatch", reason: "client_hash_differs" }, { status: 400 });
        res.headers.set("Cache-Control", "no-store");
        return res;
      }
    }

    // 4) Выпуск HPT
    const scope = ACTION_SCOPES?.[action] ?? ["auth:login"];
    const hpt = await issueHPT({ ip, ua, scope, ttlSec: 20 * 60 });

    const res = NextResponse.json({ ok: true, zeros, need: required, scope });
    // Cookie: HttpOnly + Secure(prod) + SameSite
    res.cookies.set({
      name: "hpt",
      value: hpt,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // можно ужесточить до 'strict' если UX позволяет
      path: "/",
      maxAge: 20 * 60,
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    const res = NextResponse.json(
      { message: "captcha_verify_failed", error: String(e?.message || e) },
      { status: 400 }
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
