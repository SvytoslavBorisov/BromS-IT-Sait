// src/app/api/shares/route.ts

import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions }      from "@/app/api/auth/[...nextauth]/route";
import { prisma }           from "@/lib/prisma";
import { log }              from "@/lib/logger";

export async function POST(request: Request) {
  // 1) Авторизация
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    log({ event: "shares_create_unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Парсим тело VSS-параметров
  const {
    p,
    q,
    g,
    commitments,
    threshold,
    shares,
  } = (await request.json()) as {
    p: string;
    q: string;
    g: string;
    commitments: string[];
    threshold: number;
    shares: Array<{
      recipientId:         string;
      x:                   string;
      ciphertext:          number[];
      status:              "ACTIVE" | "USED" | "EXPIRED";
      comment:             string;
      encryptionAlgorithm: string;
      expiresAt:           string | null;
    }>;
  };

  // 3) Создаём новую VSS-сессию в БД
  const vssSession = await prisma.shamirSession.create({
    data: {
      dealerId:   session.user.id,
      p,
      q,
      g,
      commitments,
      threshold,
    },
  });

  log({
    event:      "vss_session_created",
    dealerId:   session.user.id,
    sessionId:  vssSession.id,
    p,
    q,
    g,
    commitments,
    threshold,
    timestamp:  new Date().toISOString(),
  });

  // 4) Сохраняем все зашифрованные доли с новыми полями
  await prisma.share.createMany({
    data: shares.map((s) => ({
      sessionId:           vssSession.id,
      userId:              s.recipientId,
      x:                   s.x,
      ciphertext:          s.ciphertext,            // Prisma JSON поддерживает массивы
      status:              s.status,
      comment:             s.comment,
      encryptionAlgorithm: s.encryptionAlgorithm,
      expiresAt:           s.expiresAt ? new Date(s.expiresAt) : null,
    })),
  });

  // 5) Логируем каждую долю
  shares.forEach((s) =>
    log({
      event:      "vss_share_saved",
      sessionId:  vssSession.id,
      recipient:  s.recipientId,
      x:          s.x,
      status:     s.status,
      comment:    s.comment,
      timestamp:  new Date().toISOString(),
    })
  );

  return NextResponse.json({ ok: true, sessionId: vssSession.id });
}
