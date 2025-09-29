// src/app/api/captcha/state/route.ts
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
    const res = NextResponse.json(
      { message: "bad_request", reason: "bad_action" },
      { status: 400 }
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  // FAST-PATH: уже есть валидный HPT? — PoW не нужен
  const cookieHeader = (request.headers as any)?.get?.("cookie") || "";
  const hpt =
    cookieHeader.split(/;\s*/).find((c: string) => c.startsWith("hpt="))?.split("=")[1] ||
    "";

  if (hpt) {
    try {
      const ok = verifyHPT(hpt, { ua, ip, requireScope: "auth:*" });
      if (ok) {
        const res = NextResponse.json({ ok: true, skip: true }, { status: 200 });
        res.headers.set("Cache-Control", "no-store");
        return res;
      }
    } catch {
      // игнорируем и выдаём новый state
    }
  }

  // На dev не поднимать сложность из-за ::1/нестандартного UA
  const ctx = { ua, ip };
  const baseRequired = getDifficultyFor(action, ctx);
  const requiredDifficulty =
    process.env.NODE_ENV === "production" ? baseRequired : Math.min(baseRequired, 20);

  const state = signState({ action, ua, ip });

  const res = NextResponse.json(
    {
      ok: true,
      state,
      requiredDifficulty,
      ttlSec: 120, // подсказка фронту
    },
    { status: 200 }
  );
  res.headers.set("Cache-Control", "no-store");
  return res;
}
