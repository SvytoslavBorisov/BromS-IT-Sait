// app/api/recovery/[id]/receipt/route.ts

import { NextResponse }      from "next/server";
import { getServerSession }  from "next-auth/next";
import { authOptions }       from "@/app/api/auth/[...nextauth]/route";
import { prisma }            from "@/lib/prisma";

/**
 * PUT /api/recovery/:id/receipt
 * Body: { ciphertext: string }
 * Path param: id = recoveryId
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1) Extract recoveryId
  const { id: recoveryId } = await params;

  // 2) Authorize user
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  const userId = session.user.id;

  // 3) Parse ciphertext from request body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }
  const { ciphertext } = body;

  if (typeof ciphertext !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid ciphertext" },
      { status: 400 }
    );
  }

  // 4) Update only this shareholder's receipt
  const updateResult = await prisma.shareReceipt.updateMany({
    where: {
      recoveryId,
      shareholderId: userId,
      ciphertext:    undefined,  // only if not yet set
    },
    data: {
      ciphertext,
      receivedAt: new Date(),
    },
  });

  console.log('Receive', updateResult);

  if (updateResult.count === 0) {
    return NextResponse.json(
      { error: "Receipt already submitted or not found" },
      { status: 400 }
    );
  }

  // 5) Check if threshold reached
  const recovery = await prisma.recoverySession.findUnique({
    where: { id: recoveryId },
    include: {
      shareSession: {
        select: { threshold: true },
      },
      receipts: {
        select: { ciphertext: true },
      },
    },
  });
  if (!recovery) {
    return NextResponse.json(
      { error: "RecoverySession not found" },
      { status: 404 }
    );
  }

  const receivedCount = recovery.receipts.filter(r => r.ciphertext !== null).length;

  console.log('receivedCount', receivedCount, recovery.shareSession.threshold);

  if (
    receivedCount >= recovery.shareSession.threshold &&
    recovery.status !== "DONE"
  ) {
    await prisma.recoverySession.update({
      where: { id: recoveryId },
      data: {
        status:     "DONE",
        finishedAt: new Date(),
      },
    });
  }

  // 6) Return updated count
  return NextResponse.json({
    ok:       true,
    received: receivedCount,
  });
}
 