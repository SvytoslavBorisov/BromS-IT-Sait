import { NextResponse } from 'next/server';
import { prisma }       from '@/lib/prisma';
import { getServerSession }  from "next-auth/next";
import { authOptions }       from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await the params before using them
  const { id: recoveryId } = await params;

  try {
    // 1) Удаляем все связанные ShareReceipt
    await prisma.shareReceipt.deleteMany({
      where: { recoveryId },
    });

    // 2) Удаляем сам RecoverySession
    await prisma.recoverySession.delete({
      where: { id: recoveryId },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("DELETE /api/recovery/[id] error:", e);
    return NextResponse.json(
      { error: e.message || "Failed to delete recovery session" },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dealerId = session.user.id;

  const shamir = await prisma.shamirSession.findUnique({
    where: { id: sessionId },
    select: {
      dealerId:  true,
      threshold: true,
      shares: {
        select: { x: true, userId: true, ciphertext: true },
      },
    },
  });
  if (!shamir) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (shamir.dealerId !== dealerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    threshold: shamir.threshold,
  });
}
