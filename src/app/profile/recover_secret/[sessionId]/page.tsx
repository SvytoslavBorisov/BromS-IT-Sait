// src/app/profile/recover_secret/[sessionId]/page.tsx

import DealerRecovery from "@/components/profile/DealerRecovery";
import { prisma }      from "@/lib/prisma";

export default async function RecoverPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  // обязательно ждём params перед использованием
  const { sessionId } = await params;

  const recoverySession = await prisma.recoverySession.findMany({
    where: { shareSessionId: sessionId },
    select: {
      // Параметры самой RecoverySession
      id:         true,
      status:     true,
      createdAt:  true,
      finishedAt: true,

      // Параметры связанной ShamirSession
      shareSession: {
        select: {
          p:           true,
          q:           true,
          g:           true,
          commitments: true,
          threshold:   true,
        }
      },

      // Все поступившие квитанции (ShareReceipt) для этой сессии
      receipts: {
        select: {
          id:           true,
          shareholderId:true,
          ciphertext:   true,
          receivedAt:   true,
        }
      }
    }
  });

  if (!recoverySession) {
    console.log(`RecoverySession с id=${sessionId} не найдена`);

      // 1) Считываем из БД VSS-параметры и зашифрованные доли
    const shares_session = await prisma.shamirSession.findUnique({
      where: { id: sessionId },
      select: {
        p:           true,
        q:           true,
        g:           true,
        commitments: true,
        threshold:   true,
        shares: {
          select: {
            x:          true,
            userId:     true,
            ciphertext: true,
          },
        },
      },
    });

    if (!shares_session) {
      throw new Error("Сессия восстановления не найдена");
    }

    // 2) Приводим строки к bigint и bigint[]
    const p           = BigInt(shares_session.p);
    const q           = BigInt(shares_session.q);
    const g           = BigInt(shares_session.g);
    const commitments = (shares_session.commitments as string[])
      .map((c) => BigInt(c));
    const threshold   = shares_session.threshold;

    // 3) Форматируем список долей для клиента
    const shares = shares_session.shares.map((s) => ({
      x:          s.x,
      userId:     s.userId,
      ciphertext: s.ciphertext, 
    }));

    const sharesTyped = shares.map((s) => ({
      x: s.x,
      userId: s.userId,
      ciphertext: s.ciphertext as number[],
    }));

    // 4) Рендерим заголовок и клиентский компонент DealerRecovery
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">
          Восстановление секрета
        </h1>
        <DealerRecovery
          sessionId={sessionId}
          p={p}
          q={q}
          g={g}
          commitments={commitments}
          threshold={threshold}
          shares={sharesTyped}
        />
      </div>
    );
  }
  else {
    
  }
}
