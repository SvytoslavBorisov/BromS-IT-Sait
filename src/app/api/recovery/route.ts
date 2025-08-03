// app/api/recovery/route.ts

import { NextResponse } from 'next/server';
import { prisma }       from '@/lib/prisma';
import { getServerSession }   from 'next-auth/next';
import { authOptions }        from '@/app/api/auth/[...nextauth]/route';


export async function POST(request: Request) {
  // 1) Прочитаем и залогируем тело, чтобы убедиться в его форме
  const body = await request.json();
  console.log("POST /api/recovery body:", body);

  // 2) Деструктурируем с проверкой
  const shareSessionId = typeof body.shareSessionId === 'string'
    ? body.shareSessionId
    : null;
  const shareholderIds = Array.isArray(body.shareholderIds)
    ? body.shareholderIds as string[]
    : [];

  if (!shareSessionId || shareholderIds.length === 0) {
    return NextResponse.json(
      { error: "Неверный запрос: нужен shareSessionId и непустой shareholderIds" },
      { status: 400 }
    );
  }

  // 3) Проверяем, что ShamirSession существует
  const shamirSession = await prisma.shamirSession.findUnique({
    where: { id: shareSessionId },
  });
  if (!shamirSession) {
    return NextResponse.json(
      { error: 'ShamirSession не найдена' },
      { status: 404 }
    );
  }

  // 4) Создаём RecoverySession
  const recovery = await prisma.recoverySession.create({
    data: {
      dealerId:       shamirSession.dealerId,
      shareSessionId: shamirSession.id,
      receipts: {
        createMany: {
          data: shareholderIds.map(userId => ({ shareholderId: userId })),
        },
      },
      // статус PENDING по умолчанию
    },
  });

  return NextResponse.json({ recoveryId: recovery.id });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = url.searchParams.get('role');

  // --------------- запросы дольщика ---------------
  if (role === 'shareholder') {
    // 1) проверяем сессию
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2) находим все ShareReceipt без ciphertext для этого пользователя
    const recs = await prisma.shareReceipt.findMany({
      where: { shareholderId: userId, ciphertext: undefined },
      include: {
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

    // 3) мапим в ожидемый формат
    const requests = recs.map(r => ({
      id:         r.recovery.id,                          // recoveryId
      dealerId:   r.recovery.dealerId,
      x:          r.recovery.shareSession.shares[0].x,
      ciphertext: r.recovery.shareSession.shares[0].ciphertext,
    }));

    return NextResponse.json({ requests });
  }
  else if (role === 'dealer') {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const dealerId = session.user.id;

    // Берём все ShamirSession, где я дилер
    const sessions = await prisma.shamirSession.findMany({
      where: { dealerId },
      select: {
        id: true,
        threshold: true,
        createdAt: true,
        // ищем активные (не DONE) recovery
        recoveries: {
          where: { status: { not: "DONE" } },
          select: { id: true, status: true },
          take: 1
        },
      },
    });

    // мапим так, что activeRecovery либо undefined, либо { id, status }
    const result = sessions.map(s => ({
      id: s.id,
      threshold: s.threshold,
      createdAt: s.createdAt,
      activeRecovery: s.recoveries[0] || null,
    }));

    return NextResponse.json({ sessions: result });
  };

  // --------------- все прочие GET не разрешены ---------------
  return NextResponse.json(
    { error: 'Method Not Allowed' },
    { status: 405 }
  );
}

