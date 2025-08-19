import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTelegramLogin } from "@/lib/telegram/verify";
import { sendTelegramMessage } from "@/lib/telegram/send";

// Тип из Telegram Login Widget
type TelegramAuthPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string | number;
  hash: string;
  // при request-access="write" приходит:
  allows_write_to_pm?: boolean;
  // иногда приходит:
  language_code?: string;
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as TelegramAuthPayload;
    const token = process.env.TG_BOT_TOKEN!;
    const check = verifyTelegramLogin(body, token, { maxAgeSec: 300 }); // 5 минут

    if (!check.ok) {
      return NextResponse.json({ error: check.reason || "Bad signature" }, { status: 401 });
    }

    // Не даём привязать один и тот же telegramId к разным пользователям
    const tgId = String(body.id);
    const other = await prisma.user.findFirst({
      where: { telegramId: tgId, NOT: { id: session.user.id } },
      select: { id: true },
    });
    if (other) {
      return NextResponse.json(
        { error: "Этот Telegram уже привязан к другому аккаунту" },
        { status: 409 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        telegramId: tgId,
        telegramUsername: body.username ?? null,
        telegramPhotoUrl: body.photo_url ?? null,
        telegramLanguageCode: body["language_code" as keyof TelegramAuthPayload] as any ?? null,
        telegramAllowsWrite: Boolean(body.allows_write_to_pm),
        telegramLinkedAt: new Date(),
        telegramLastAuthAt: new Date(Number(body.auth_date) * 1000),
      },
      select: { id: true, telegramId: true, telegramUsername: true, telegramAllowsWrite: true },
    });

  if (updated.telegramId) {
    // 2) Если ты рассчитываешь писать без /start, убедись что у тебя был виджет с request_access=write,
    // и в БД сохранилось telegramAllowsWrite = true
    if (updated.telegramAllowsWrite !== false) {
      try {
        const r = await sendTelegramMessage(updated.telegramId, "Привет! Теперь я могу присылать тебе уведомления 🚀");
        console.log("TG sent:", r?.result?.message_id);
      } catch (e) {
        console.error("TG send failed:", e);
        // можешь пробросить в ответ API, чтобы увидеть причину в клиенте
      }
    } else {
      console.warn("User didn't grant write access (allows_write_to_pm=0). Ask them to /start the bot.");
    }
  }

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

