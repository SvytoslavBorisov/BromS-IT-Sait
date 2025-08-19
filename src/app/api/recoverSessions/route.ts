// app/api/recoverSessions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

type RecoverSummary = {
  id: string;
  createdAtISO: string;
  status: string;          // e.g. PENDING | IN_PROGRESS | FINISHED | CANCELED
  role: "DEALER" | "SHAREHOLDER";
  shareSessionId: string;
  participants: number;    // уникальных участников (по receipts)
  isActive: boolean;       // удобно для UI (кнопка "продолжить")
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const rows = await prisma.recoverySession.findMany({
    where: {
      OR: [
        { receipts: { some: { shareholderId: userId } } }, // я участник
        { dealerId: userId },                               // я дилер
      ],
    },
    select: {
      id: true,
      shareSessionId: true,
      dealerId: true,
      createdAt: true,
      status: true,
      receipts: {
        select: { shareholderId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data: RecoverSummary[] = rows.map(r => {
    const role: "DEALER" | "SHAREHOLDER" = r.dealerId === userId ? "DEALER" : "SHAREHOLDER";
    const participants = new Set(r.receipts.map(x => x.shareholderId)).size;
    const isActive = r.status === "PENDING";

    return {
      id: r.id,
      createdAtISO: r.createdAt.toISOString(),
      status: r.status,
      role,
      shareSessionId: r.shareSessionId,
      participants,
      isActive,
    };
  });

  return NextResponse.json(data, { status: 200 });
}
