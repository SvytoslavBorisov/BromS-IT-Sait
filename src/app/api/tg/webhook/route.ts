// src/app/api/tg/webhook/route.ts
import { NextRequest } from "next/server";
import { getBot } from "@/bot";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// утилита для IP
function getClientIp(req: NextRequest): string {
  const xfwd = req.headers.get("x-forwarded-for"); // может быть "ip1, ip2, ip3"
  if (xfwd && xfwd.length > 0) return xfwd.split(",")[0].trim();
  const xreal = req.headers.get("x-real-ip");
  if (xreal) return xreal;
  return "unknown";
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    // ⬇️ используем свою утилиту
    const ip = getClientIp(req);
    logger.warn({ msg: "Forbidden webhook call", ip });
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const update = await req.json();
    const bot = getBot();
    await bot.handleUpdate(update);
  } catch (e) {
    logger.errorEx(e, { scope: "tg-webhook" });
    // для Telegram достаточно 200 OK, иначе он будет ретраить
  }

  return new Response("OK", { status: 200 });
}
