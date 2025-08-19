import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions }      from "@/lib/auth";
import { prisma }           from "@/lib/prisma";

type SessionSummary = {
  id: string;
  createdAtISO: string;
  threshold: number;
  nShares: number;        // всего сгенерированных шеров
  scheme: "CUSTOM" | "ASYMMETRIC";
  title?: string | null;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- ЗАБЕРЁМ СЕССИИ ДИЛЕРА ---
  const raw = await prisma.shamirSession.findMany({
    where: { dealerId: session.user.id },
    select: {
      id: true,
      createdAt: true,
      threshold: true,
      status: true,        // ShamirSessionStatus enum: CUSTOM | ASYMMETRIC
      title: true,         // если в модели есть (иначе можно убрать)
      // Если у вас связи называются иначе — замените 'shares' и 'recoveries' ниже.
      _count: { select: { shares: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data: SessionSummary[] = raw.map(row => {
    const nShares = row._count?.shares ?? 0;

    return {
      id: row.id,
      createdAtISO: row.createdAt.toISOString(),
      threshold: row.threshold,
      nShares,
      scheme: (row.status as "CUSTOM" | "ASYMMETRIC") ?? "CUSTOM",
      title: (row as any).title ?? null,
    };
  });

  return NextResponse.json(data);
}