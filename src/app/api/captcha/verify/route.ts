// src/app/api/captcha/verify/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { extractIpUa } from "@/lib/auth/utils";
import {
  ACTION_SCOPES,
  verifyAndParseState,
  getDifficultyFor,
  type CaptchaAction,
  splitSignedState,
} from "@/lib/captcha/state";
import { issueHPT } from "@/lib/captcha/hpt";
import crypto from "crypto";


function b64urlToBuf(s: string): Buffer {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function hexToBuf(hex: string): Buffer {
  if (!/^[0-9a-f]+$/i.test(hex) || (hex.length & 1)) throw new Error("bad_hex");
  return Buffer.from(hex, "hex");
}

function leadingZeroBits(buf: Buffer): number {
  let c = 0;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b === 0) { c += 8; continue; }
    for (let k = 7; k >= 0; k--) { if (((b >> k) & 1) === 0) c++; else return c; }
    break;
  }
  return c;
}

export async function POST(request: Request) {
  try {
    const { action, state, pow } = await request.json() as {
      action: CaptchaAction; state: string; pow: { nonceHex: string; hashHex?: string; difficulty?: number };
    };
    const { ip, ua } = extractIpUa(request);

    // 1) Проверка подписанного state (подпись/TTL/UA/действие)
    const vr = verifyAndParseState(state, { action, ip, ua, maxAgeSec: 180 });
    if (!vr.ok) {
      const res = NextResponse.json({ message:"invalid_state" }, { status:400 });
      res.headers.set("Cache-Control","no-store");
      return res;
    }

    // 2) Пересчитываем хеш: SHA-256( stateBody || nonce )
    const { bodyB64 } = splitSignedState(state);
    const digest = crypto
      .createHash("sha256")
      .update(Buffer.concat([ b64urlToBuf(bodyB64), hexToBuf(pow.nonceHex) ]))
      .digest();
    const zeros = leadingZeroBits(digest);

    // 3) Требуемая сложность — из state, фолбэк — серверный расчёт
    const required = Math.max(1, Math.min(28, vr.need ?? getDifficultyFor(action, { ua, ip, env: process.env.NODE_ENV })));
    if (zeros < required) {
      const res = NextResponse.json({ message:"insufficient_pow", need: required, zeros }, { status:400 });
      res.headers.set("Cache-Control","no-store");
      return res;
    }

    // 4) Выдаём HPT (cookie)
    const scope = ACTION_SCOPES[action] || [];
    const hpt = issueHPT({ scope, ua, ip, ttlSec: 20 * 60 });

    const isProd = process.env.NODE_ENV === "production";

    const domain = process.env.APP_COOKIE_DOMAIN || undefined;

    const res = NextResponse.json({ ok:true }, { status:200 });
    res.headers.set("Cache-Control","no-store");
    const cookie: Parameters<typeof res.cookies.set>[0] = {
      name: "hpt",
      value: hpt,
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 20 * 60,
      ...(isProd && domain ? { domain } : {}),
    };
    res.cookies.set(cookie);
    return res;
  } catch (e: any) {
    const res = NextResponse.json({ message:"captcha_verify_failed", error: String(e?.message || e) }, { status:400 });
    res.headers.set("Cache-Control","no-store");
    return res;
  }
}
