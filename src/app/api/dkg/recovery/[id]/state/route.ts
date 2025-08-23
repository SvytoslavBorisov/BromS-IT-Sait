// src/app/api/dkg/recovery/[id]/state/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const rec = await prisma.dkgRecoverySession.findUnique({
      where: { id: params.id },
      include: {
        participants: true,
        shares: { select: { fromUserId: true, proofOk: true, createdAt: true } },
      }
    });
    if (!rec) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      item: {
        id: rec.id,
        sourceSessionId: rec.sourceSessionId,
        status: rec.status,
        n: rec.n, t: rec.t, epoch: rec.epoch, qHash: rec.qHash,
        requesterUserId: rec.requesterUserId,
        resultCiphertext: rec.resultCiphertext,
        resultMeta: rec.resultMeta ? JSON.parse(rec.resultMeta) : null,
        participants: rec.participants.map(p => ({ userId: p.userId })),
        shares: rec.shares,
        createdAt: rec.createdAt
      }
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "STATE failed" }, { status: 500 });
  }
}
