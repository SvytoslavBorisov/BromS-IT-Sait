// src/app/api/dkg/recovery/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Создать recovery-комнату
// body: { sourceSessionId: string, requesterPubKey: string }
// ответ: { ok, id }
export async function POST(req: Request) {
  try {
    const { sourceSessionId, requesterPubKey } = await req.json();
    if (!sourceSessionId || !requesterPubKey)
      return NextResponse.json({ ok: false, error: "Bad input" }, { status: 400 });

    // подтягиваем исходную DKG
    const src = await prisma.dkgSession.findUnique({
      where: { id: sourceSessionId },
      include: {
        commitments: true,  // DkgCommitment[]
        readiness: true     // DkgReady[] (ожидаем, что финализировали и есть Qhash)
      }
    });
    if (!src) return NextResponse.json({ ok: false, error: "Source not found" }, { status: 404 });

    // Qhash берём из любого ready (у тебя DkgReady хранит Qhash от клиента)
    const ready = src.readiness[0];
    if (!ready?.Qhash) {
      return NextResponse.json({ ok: false, error: "Source not finalized (no Qhash)" }, { status: 409 });
    }

    // requester — возьмём текущего пользователя (если у тебя есть /api/me, можно вытащить в middleware или session)
    // Для простоты — опционально: можно принять requesterUserId в body.
    // Здесь покажу безопасный вариант с /api/me.
    const meResp = await fetch(`${process.env.NEXTAUTH_URL}/api/me`, { cache: "no-store" });
    const me = meResp.ok ? await meResp.json() : null;
    const requesterUserId = me?.user?.id || me?.id || me?.userId;
    if (!requesterUserId)
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const rec = await prisma.dkgRecoverySession.create({
      data: {
        sourceSessionId,
        qHash: ready.Qhash,
        n: src.n,
        t: src.t,
        epoch: src.epoch,
        requesterUserId,
        requesterPubKey,
        status: "OPEN"
      }
    });

    return NextResponse.json({ ok: true, id: rec.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "POST failed" }, { status: 500 });
  }
}

// Список recovery-комнат
export async function GET() {
  try {
    const rows = await prisma.dkgRecoverySession.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { participants: true, shares: true } } },
      take: 100,
    });
    const items = rows.map(r => ({
      id: r.id,
      sourceSessionId: r.sourceSessionId,
      qHash: r.qHash,
      n: r.n,
      t: r.t,
      epoch: r.epoch,
      requesterUserId: r.requesterUserId,
      requesterPubKey: r.requesterPubKey,
      status: r.status,
      resultCiphertext: r.resultCiphertext || undefined,
      resultMeta: r.resultMeta || undefined,
      participantsCount: (r as any)._count?.participants ?? 0,
      sharesCount: (r as any)._count?.shares ?? 0,
      createdAt: r.createdAt
    }));
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "GET failed" }, { status: 500 });
  }
}
