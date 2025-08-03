import DealerRecovery from "@/components/profile/DealerRecovery";
import { prisma }      from "@/lib/prisma";

export default async function RecoverPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const { sessionId } = params;

  // 1) Загрузка данных напрямую из БД
  const shamir = await prisma.shamirSession.findUnique({
    where: { id: sessionId },
    select: {
      prime:     true,
      threshold: true,
      shares: {
        select: { x: true, userId: true },
      },
    },
  });

  if (!shamir) {
    throw new Error("ShamirSession не найдена");
  }

  const shares    = shamir.shares.map(s => ({ x: s.x, userId: s.userId }));
  const threshold = shamir.threshold;
  const prime     = BigInt(shamir.prime);

  // 2) Рендер
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Восстановление секрета</h1>
      <DealerRecovery
        sessionId={sessionId}
        shares={shares}
        threshold={threshold}
        prime={prime}
      />
    </div>
  );
}