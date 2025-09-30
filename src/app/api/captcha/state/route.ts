// src/app/api/captcha/state/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { extractIpUa } from "@/lib/auth/utils";
import {
  isAllowedAction,
  getDifficultyFor,
  type CaptchaAction,
  signState,
} from "@/lib/captcha/state";
import { verifyHPT } from "@/lib/captcha/hpt";

export async function GET(request: Request) {
  const { ip, ua } = extractIpUa(request);
  const url = new URL(request.url);
  const action = url.searchParams.get("act") as CaptchaAction | null;

  if (!action || !isAllowedAction(action)) {
    const res = NextResponse.json({ ok:false, message:"bad_action" }, { status:400 });
    res.headers.set("Cache-Control","no-store");
    return res;
  }

  // если уже есть валидный hpt — можно скипнуть PoW
  const rawCookie = (request.headers as any).get?.("cookie") || "";
  const hpt = rawCookie.split(/;\s*/).find((c:string)=>c.startsWith("hpt="))?.split("=")[1] || "";
  const skip = !!(hpt && verifyHPT(hpt, { ua, ip, requireScope: `auth:${action}` }));

  const requiredDifficulty = getDifficultyFor(action, { ua, ip, env: process.env.NODE_ENV });
  const ttlSec = 120;

  // подписанный state = "<body>.<sig>", где body — чистый base64url без padding.
  const { state, stateBody } = signState({
    action,
    ua,
    ip,
    need: requiredDifficulty,
    ttlSec,
  });

  const res = NextResponse.json({ ok:true, skip, state, stateBody, requiredDifficulty, ttlSec }, { status:200 });
  res.headers.set("Cache-Control","no-store");
  return res;
}
