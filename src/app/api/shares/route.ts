// app/api/shares/route.ts

import { NextResponse }      from "next/server";
import { getServerSession }  from "next-auth/next";
import { authOptions }       from "@/app/api/auth/[...nextauth]/route";
import { prisma }            from "@/lib/prisma";
import { log }               from "@/lib/logger";

export async function POST(request: Request) {
  // 1) Авторизация
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    log({ event: "shares_create_unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Парсим тело
  const { prime, threshold, shares } = await request.json() as {
    prime:     string;
    threshold: number;
    shares:    Array<{
      recipientId: string;
      x:           string;
      ciphertext:  number[];
    }>;
  };

  // 3) Создаём новую сессию разделения в БД
  const shamirSession = await prisma.shamirSession.create({
    data: {
      dealerId:  session.user.id,
      prime,
      threshold,
    },
  });

  log({
    event:      "shamir_session_created",
    dealerId:   session.user.id,
    sessionId:  shamirSession.id,
    prime,
    threshold,
    timestamp:  new Date().toISOString(),
  });

  // 4) Сохраняем все доли, привязанные к этой сессии
  await prisma.share.createMany({
    data: shares.map((s) => ({
      sessionId:  shamirSession.id,
      userId:     s.recipientId,
      x:          s.x,
      ciphertext: s.ciphertext,  // Prisma Json — сохраняем Base64
    })),
  });

  // 5) Подробное логирование
  shares.forEach((s) =>
    log({
      event:      "share_saved",
      sessionId:  shamirSession.id,
      recipient:  s.recipientId,
      x:          s.x,
      timestamp:  new Date().toISOString(),
    })
  );

  return NextResponse.json({ ok: true, sessionId: shamirSession.id });
}
