// src/app/api/recovery/route.ts

import { NextResponse }         from "next/server";
import { prisma }               from "@/lib/prisma";
import { getServerSession }     from "next-auth/next";
import { authOptions }          from "@/app/api/auth/[...nextauth]/route";
import { log }                  from "@/lib/logger";

export async function POST(request: Request) {
  // 1) Авторизация
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    log({ event: "recovery_unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Читаем тело — нам нужен только shareSessionId
  const { shareSessionId } = (await request.json()) as { shareSessionId?: string };
  if (!shareSessionId) {
    return NextResponse.json(
      { error: "Нужен shareSessionId" },
      { status: 400 }
    );
  }

  // 3) Проверяем, что сессия разделения (VSS) существует и вы — её дилер
  const sessionRec = await prisma.shamirSession.findUnique({
    where: { id: shareSessionId },
    select: { id: true, dealerId: true },
  });
  if (!sessionRec) {
    return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
  }
  if (sessionRec.dealerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4) Собираем из Share все userId, кому мы когда-то отправили доли
  const shares = await prisma.share.findMany({
    where: { sessionId: shareSessionId },
    select: { userId: true },
  });
  const shareholderIds = shares.map((s) => s.userId);
  if (shareholderIds.length === 0) {
    return NextResponse.json(
      { error: "В этой сессии нет ни одной доли" },
      { status: 400 }
    );
  }

  // 5) Создаём RecoverySession и создаём все записи receipt
  const recovery = await prisma.recoverySession.create({
    data: {
      dealerId:       sessionRec.dealerId,
      shareSessionId: shareSessionId,
      receipts: {
        createMany: {
          data: shareholderIds.map((userId) => ({ shareholderId: userId })),
        },
      },
    },
  });

  log({
    event:      "recovery_started",
    recoveryId: recovery.id,
    shareSessionId,
    participants: shareholderIds,
    timestamp:  new Date().toISOString(),
  });

  return NextResponse.json({ recoveryId: recovery.id });
}


export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = url.searchParams.get("role");

  // --- shareholder: отдаём все запросы на отдачу доли этому пользователю ---
  if (role === "shareholder") {
    // 1) Авторизация
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 2) Берём все записи shareReceipt, где дилер запросил вашу долю
    const pending = await prisma.shareReceipt.findMany({
      where: {
        shareholderId: userId,
        ciphertext:    undefined,    // ещё не ваша ответка
      },
      include: {
        recovery: {
          select: {
            id: true,
            dealerId: true,
            shareSession: {
              select: {
                shares: {
                  where: { userId },
                  select: { x: true, ciphertext: true },  // Ориджинал от дилера
                },
              },
            },
          },
        },
      },
    });

    // 3) Мапим на то, что ждёт клиент
    const requests = pending.map((r) => {
      const share = r.recovery.shareSession.shares[0];
      return {
        id:         r.recovery.id,       // recoverySession.id
        dealerId:   r.recovery.dealerId,
        x:          share.x,
        ciphertext: share.ciphertext as number[], // вот реальный ciphertext
      };
    });

    return NextResponse.json({ requests });
  }

if (role === "dealer") {
  // 1) проверяем аутентификацию
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dealerId = session.user.id;

  // 2) берём все сессии разделения, которые создал дилер
  const sessions = await prisma.shamirSession.findMany({
    where: { dealerId },
    select: {
      id:        true,
      threshold: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // 3) для каждой сессии считаем общее количество долей и вернувшиеся
  const result = await Promise.all(
    sessions.map(async (s) => {
      const total = await prisma.share.count({
        where: { sessionId: s.id },
      });
      const returned = await prisma.share.count({
        where: {
          sessionId: s.id,
          ciphertext: { not: [] },  // массив уже заполнен
        },
      });
      return {
        sessionId: s.id,
        createdAt: s.createdAt,
        threshold: s.threshold,
        total,
        returned,
      };
    })
  );

  // 4) отдаем в поле `sessions`
  return NextResponse.json({ sessions: result });
}
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}