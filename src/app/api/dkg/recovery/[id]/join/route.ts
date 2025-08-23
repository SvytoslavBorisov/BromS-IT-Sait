// src/app/api/dkg/recovery/[id]/join/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { e2ePublicKey } = await req.json().catch(() => ({}));
    const id = params.id;

    // кто я (как и раньше — через /api/me)
    const meResp = await fetch(`${process.env.NEXTAUTH_URL}/api/me`, { cache: "no-store" });
    const me = meResp.ok ? await meResp.json() : null;
    const userId = me?.user?.id || me?.id || me?.userId;
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const rec = await prisma.dkgRecoverySession.findUnique({
      where: { id },
      include: {
        sourceSession: { include: { participants: true } }
      }
    });
    if (!rec) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    if (rec.status !== "OPEN")
      return NextResponse.json({ ok: false, error: "Not open" }, { status: 409 });

    // разрешаем join только участникам исходной DKG
    const inSource = rec.sourceSession.participants.some(p => p.userId === userId);
    if (!inSource)
      return NextResponse.json({ ok: false, error: "Not a source participant" }, { status: 403 });

    await prisma.dkgRecoveryParticipant.upsert({
      where: { recoveryId_userId: { recoveryId: rec.id, userId } },
      update: { e2ePublicKey: e2ePublicKey ?? undefined },
      create: { recoveryId: rec.id, userId, e2ePublicKey: e2ePublicKey ?? null }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "JOIN failed" }, { status: 500 });
  }
}
