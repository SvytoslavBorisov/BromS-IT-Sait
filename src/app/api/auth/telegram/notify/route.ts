import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram/send";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Field 'enabled' must be boolean" }, { status: 400 });
  }

  // проверим, что Телеграм привязан и можно писать в ЛС
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramId: true, telegramAllowsWrite: true },
  });

  if (!user?.telegramId) {
    return NextResponse.json(
      { error: "Telegram не привязан к аккаунту" },
      { status: 409 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { telegramAllowsWrite: body.enabled },
    select: { id: true, telegramAllowsWrite: true, telegramId: true },
  });

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

  // необязательный аудит
  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "telegram.notify_toggled",
        enabled: updated.telegramAllowsWrite,
        userId: session.user.id,
      }),
    });
  } catch {}

  return NextResponse.json({ enabled: updated.telegramAllowsWrite });
}
