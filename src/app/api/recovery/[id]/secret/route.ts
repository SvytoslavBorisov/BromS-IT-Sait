// app/api/recovery/[id]/secret/route.ts

import { NextResponse } from 'next/server';
import { prisma }       from '@/lib/prisma';

/**
 * GET /api/recovery/:id/secret
 * Ответ: { shares: { x: string, ciphertext: Json }[] }
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: recoveryId } = await params;

  // 1. Получаем RecoverySession вместе с порогом и всеми долями ShamirSession
  const recovery = await prisma.recoverySession.findUnique({
    where: { id: recoveryId },
    include: {
      shareSession: {               // связь на модель ShamirSession
        select: { shares: true, threshold: true },
      },
      receipts: true,               // ShareReceipt[]
    },
  });

  if (!recovery) {
    return NextResponse.json(
      { error: 'RecoverySession not found' },
      { status: 404 }
    );
  }

  if (recovery.status !== 'DONE') {
    return NextResponse.json(
      { error: 'Not enough receipts yet' },
      { status: 409 }
    );
  }

  // 2. Собираем только действительно полученные доли
  const shares = recovery.receipts
    .filter(r => r.ciphertext !== null)
    .map(r => {
      // Находим у ShamirSession нужную точку по shareholderId
      const shareRec = recovery.shareSession.shares.find(
        sh => sh.userId === r.shareholderId
      );
      return {
        x:          shareRec!.x,
        ciphertext: r.ciphertext!,
      };
    });

  return NextResponse.json({ shares });
}
