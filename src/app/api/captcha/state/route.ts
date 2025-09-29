// src/app/api/captcha/state/route.ts
import { NextResponse } from "next/server";
import { extractIpUa } from "@/lib/auth/utils";
import { isAllowedAction, getDifficultyFor, type CaptchaAction, signState } from "@/lib/captcha/state";

export async function GET(request: Request) {
  const { ip, ua } = extractIpUa(request);
  const url = new URL(request.url);
  const action = url.searchParams.get("act") as CaptchaAction | null;

  if (!action || !isAllowedAction(action)) {
    const res = NextResponse.json({ message: "bad_request", reason: "bad_action" }, { status: 400 });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  // На dev не поднимать сложность из-за ::1/нестандартного UA
  const ctx = { ua, ip };
  const baseRequired = getDifficultyFor(action, ctx);
  const requiredDifficulty =
    process.env.NODE_ENV === "production" ? baseRequired : Math.min(baseRequired, 20);

  const state = signState({ action, ua, ip });

  const res = NextResponse.json({
    ok: true,
    state,
    requiredDifficulty,
    ttlSec: 120,        // подсказываем фронту TTL state (информативно)
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
