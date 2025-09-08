// src/app/api/tg/progress/route.ts
import { NextRequest } from "next/server";
import { verifyTelegramInitData, parseWebAppInitData } from "@/lib/telegram/webapp";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ ok: true, ts: Date.now() });
}

export async function POST(req: NextRequest) {
  try {
    const initData = req.headers.get("x-telegram-init-data") || "";
    const token = process.env.BOT_TOKEN || "";

    if (!verifyTelegramInitData(initData, token)) {
      return Response.json({ ok: false, error: "invalid initData" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const { score = 0 } = (body ?? {}) as { score?: number };

    const init = parseWebAppInitData(initData);
    const uid = init?.user?.id;
    const uname = init?.user?.username || init?.user?.first_name;

    // Здесь сохраните прогресс в БД. Пока просто лог:
    logger.info({ msg: "progress", uid, uname, score, at: new Date().toISOString() });

    return Response.json({ ok: true });
  } catch (e) {
    logger.errorEx(e, { scope: "progress" });
    return Response.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
