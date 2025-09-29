// src/app/api/captcha/verify/route.ts
import { NextResponse } from "next/server";
import { extractIpUa } from "@/lib/auth/utils";
import {
  ACTION_SCOPES,
  verifyAndParseState,
  getDifficultyFor,
  type CaptchaAction,
} from "@/lib/captcha/state";
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
    if (b === 0) {
      c += 8;
      continue;
    }
    for (let k = 7; k >= 0; k--) {
      if (((b >> k) & 1) === 0) c++;
      else return c;
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
      const res = NextResponse.json({ message: "bad_request" }, { status: 400 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    const { ip, ua } = extractIpUa(request);

    // 1) verify state (подпись, TTL, привязка к UA/IP — IP мягко, UA строго)
    const vr = verifyAndParseState(state, { action, ip, ua, maxAgeSec: 180 });
    if (!vr.ok) {
      const res = NextResponse.json({ message: "invalid_state" }, { status: 400 });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // 2) Проверка PoW: sha256(state_bytes || nonce_bytes)
    const stateBytes = b64urlToBuf(state);
    const nonceBytes = hexToBuf(pow.nonceHex);
    const digest = crypto
      .createHash("sha256")
      .update(Buffer.concat([stateBytes, nonceBytes]))
      .digest();

    const zeros = leadingZeroBits(digest);

    // ВАЖНО: доверяем ТОЛЬКО серверной сложности (из состояния/контекста), а не тому, что прислал клиент
    const serverRequired = getDifficultyFor(action, { ua, ip });
    const required = Math.max(1, Math.min(28, serverRequired)); // жёсткая отсечка сверху

    if (zeros < required) {
      const res = NextResponse.json(
        { message: "pow_too_weak", zeros, need: required },
        { status: 400 }
      );
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // 3) Выпуск HPT (HttpOnly cookie) со скоупом действия
    const scope = ACTION_SCOPES[action];
    const hpt = await issueHPT({ ip, ua, scope, ttlSec: 20 * 60 });

    const res = NextResponse.json({ ok: true, zeros }, { status: 200 });
    res.headers.set("Cache-Control", "no-store");

    // Кука: dev — без domain/secure; prod — с domain и secure
    const isProd = process.env.NODE_ENV === "production";
    const domain = process.env.APP_COOKIE_DOMAIN || undefined; // напр. ".bromsit.ru"

    const cookie: Parameters<typeof res.cookies.set>[0] = {
      name: "hpt",
      value: hpt,
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 20 * 60,
    };
    if (isProd && domain) {
      (cookie as any).domain = domain;
    }
    res.cookies.set(cookie);

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
