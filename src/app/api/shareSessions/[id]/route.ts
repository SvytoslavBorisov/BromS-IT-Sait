import { NextResponse } from 'next/server';
import { prisma }       from '@/lib/prisma';
import { getServerSession }  from "next-auth/next";
import { authOptions }       from "@/lib/auth";


export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await the params before using them
  const { id: shamirSessionId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {

    const res = await prisma.recoverySession.findFirst({
      where: { shareSessionId: shamirSessionId },
    });

    await prisma.shareReceipt.deleteMany({
      where: { recoveryId: res?.id },
    });
      
    await prisma.recoverySession.deleteMany({
      where: { id: res?.id },
    });

    console.log(res);

    await prisma.share.deleteMany({
      where: { sessionId: shamirSessionId },
    });

    await prisma.shamirSession.deleteMany({
      where: { id: shamirSessionId },
    });

    // 2) Удаляем сам RecoverySession
    return NextResponse.json({ ok: true });

  } catch (e: any) {
    console.error("DELETE /api/shareSession/[id] error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to delete shareSession" },
      { status: 500 }
    );
  }
}
