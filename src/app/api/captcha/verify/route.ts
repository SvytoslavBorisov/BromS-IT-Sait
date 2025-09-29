// src/app/api/captcha/verify/route.ts
import { NextResponse } from "next/server";
import { extractIpUa } from "@/lib/auth/utils";
import { ACTION_SCOPES, verifyAndParseState, type CaptchaAction } from "@/lib/captcha/state";
import { issueHPT } from "@/lib/captcha/hpt";
import crypto from "crypto";

// base64url без padding -> Buffer
function b64urlToBuf(s: string): Buffer {
  // приводим к base64
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

export async function POST(request: Request) {
  try {
    const { action, state, pow } = (await request.json()) as {
      action?: CaptchaAction;
      state?: string; // base64url без padding
      pow?: { nonceHex?: string; hashHex?: string; difficulty?: number };
    };

    if (!action || !state || !pow?.nonceHex) {
      return NextResponse.json({ message: "bad_request" }, { status: 400 });
    }

    const { ip, ua } = extractIpUa(request);

    // 1) verify state (подпись, TTL, привязка к UA/IP — IP мягко, UA строго)
    const vr = verifyAndParseState(state, { action, ip, ua, maxAgeSec: 180 }); // login: до 180с
    if (!vr.ok) {
      return NextResponse.json({ message: "invalid_state" }, { status: 400 });
    }

    // 2) Проверка PoW: sha256(state_bytes || nonce_bytes)
    const stateBytes = b64urlToBuf(state);
    const nonceBytes = hexToBuf(pow.nonceHex);
    const digest = crypto.createHash("sha256").update(Buffer.concat([stateBytes, nonceBytes])).digest();

    const zeros = leadingZeroBits(digest);
    const required = Math.max(1, Math.min(28, pow.difficulty ?? 18)); // login по умолчанию 18
    if (zeros < required) {
      return NextResponse.json({ message: "pow_too_weak", zeros, need: required }, { status: 400 });
    }

    // 3) Выпуск HPT (HttpOnly cookie) со скоупом действия
    const scope = ACTION_SCOPES[action]; // например: ["auth:login"] | ["auth:reset"] ...
    const hpt = await issueHPT({ ip, ua, scope, ttlSec: 20 * 60 });

    const res = NextResponse.json({ ok: true, zeros });
    res.cookies.set({
      name: "hpt",
      value: hpt,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 20 * 60,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { message: "captcha_verify_failed", error: String(e?.message || e) },
      { status: 400 }
    );
  }
}
