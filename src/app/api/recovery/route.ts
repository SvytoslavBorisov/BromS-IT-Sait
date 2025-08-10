// src/app/api/recovery/route.ts

import { NextRequest, NextResponse }         from "next/server";
import { prisma }               from "@/lib/prisma";
import { getServerSession }     from "next-auth/next";
import { authOptions }       from "@/lib/auth";
import { log }                  from "@/lib/logger";
import { getToken } from "next-auth/jwt";


export async function POST(req: NextRequest) {
  // 4) Попробуем getServerSession
  const session = await getServerSession(authOptions);

  // 5) Если ни токен, ни сессия не работают — сразу выходим
  if (!session?.user) {
    console.log({ event: "recovery_unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Неавторизован" }, { status: 401 });
  }

  // 2) Читаем тело — нам нужен только shareSessionId
  const { shareSessionId } = (await req.json()) as { shareSessionId?: string };
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

  const existing = await prisma.recoverySession.findFirst({
    where: {
      shareSessionId: shareSessionId,
      dealerId:       sessionRec.dealerId,
    }
  });
  if (existing) {
      return NextResponse.json({ recoveryId: existing.id });
  }

  // 5) Создаём RecoverySession и создаём все записи receipt
  // src/app/api/recovery/route.ts (POST)
  const recovery = await prisma.recoverySession.create({
    data: {
      dealerId:       sessionRec.dealerId,
      shareSessionId: shareSessionId
    },
  });
  
  await prisma.shareReceipt.createMany({
    data: shareholderIds.map((userId) => ({
      recoveryId:     recovery.id,     // связываем с только что созданной сессией
      shareholderId:  userId,          // каждый из переданных идентификаторов
      shareSessionId,
      status: 'AWAIT',
      senderId: session?.user.id                 // если в модели оно есть
    })),
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

    const pending = await prisma.shareReceipt.findMany({
      where: {
        shareholderId: userId,
        ciphertext: {
          equals: [] as any,  // приведение к JsonValue
        },
      },
      select: {
        id: true,
        shareholderId: true,
        status: true,     // ← вот оно, поле статуса из shareReceipt
        ciphertext: true, // если нужно
        recovery: {
          select: {
            id: true,
            dealerId: true,
            shareSession: {
              select: {
                shares: {
                  where: { userId },
                  select: { x: true, ciphertext: true },
                },
              },
            },
          },
        },
      },
    });
    console.log(pending);

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
      dealerId: true
    },
    orderBy: { createdAt: "desc" },
  });

  // 3) для каждой сессии считаем общее количество долей и вернувшиеся
  const result = await Promise.all(
    sessions.map(async (s) => {
      // 1) Считаем общее число долей и число уже возвращённых:
      const total = await prisma.share.count({
        where: { sessionId: s.id },
      });
      const returned = await prisma.share.count({
        where: {
          sessionId: s.id,
          ciphertext: { not: [] },
        },
      });

      // 2) Ищем, есть ли уже запущенная сессия восстановления для этой ShamirSession
      const rec = await prisma.recoverySession.findFirst({
        where: { shareSessionId: s.id },
        select: {
          dealerId: true,
          status:   true,
        },
        orderBy: { createdAt: "desc" },  // если их несколько, берём последнюю
      });

      console.log('s', s);

      return {
        id:             s.id,
        createdAt:      s.createdAt,
        threshold:      s.threshold,
        total,
        returned,
        creatorId:      s.dealerId   ?? null,
        recoveryStatus: rec?.status     ?? 'NO ACTION',
      };
    })
  );

  // 4) отдаем в поле `sessions`
  return NextResponse.json({ sessions: result });
}
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}