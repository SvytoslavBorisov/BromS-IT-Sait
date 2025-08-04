// src/app/api/recovery/[id]/secret/route.ts

import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";

/**
 * GET /api/recovery/:id/secret
 * Ответ: { shares: { x: string, ciphertext: string }[] }
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: recoveryId } = await params;

  const recovery = await prisma.recoverySession.findUnique({
    where: { id: recoveryId },
    include: {
      shareSession: {
        select: {
          threshold: true,
          shares: {
            select: {
              x:      true,
              userId: true,
            }
          }
        }
      },
      receipts: {
        where: { ciphertext: { not: undefined } },
        select: { shareholderId: true, ciphertext: true },
      },
    },
  });

  if (!recovery) {
    return NextResponse.json({ error: "RecoverySession не найдена" }, { status: 404 });
  }

  
  if (recovery.status !== "DONE") {
    return NextResponse.json(
      { error: "Недостаточно ответов для восстановления" },
      { status: 409 }
    );
  }

  const shares = recovery.receipts.map((r) => {
    const point = recovery.shareSession.shares.find(
      (sh) => sh.userId === r.shareholderId
    );
    if (!point) {
      throw new Error(`Не найдена исходная доля для пользователя ${r.shareholderId}`);
    }
    return {
      x:          point.x,
      ciphertext: r.ciphertext as string,
    };
  });

  return NextResponse.json({ shares });
}