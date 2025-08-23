// src/app/api/dkg/recovery/[id]/share/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ECPoint } from "@/lib/crypto/gost/ec";
// ⚠️ проверь имена экспорта сложения точек в твоей либе
import { ecAdd } from "@/lib/crypto/gost/ec"; 
import { verifyShare } from "@/lib/dkg/client-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// агрегируем коммитменты по индексам коэффициентов
function aggregateCommitments(all: ECPoint[][]): ECPoint[] {
  const L = Math.max(...all.map(arr => arr.length));
  const out: ECPoint[] = [];
  for (let k = 0; k < L; k++) {
    let acc: ECPoint | null = null;
    for (const Cj of all) {
      const P = Cj[k];
      if (!P) continue;
      acc = acc ? ecAdd(acc, P) : P;
    }
    if (!acc) throw new Error("No commitments at index " + k);
    out.push(acc);
  }
  return out;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { sHex } = await req.json();
    if (!sHex) return NextResponse.json({ ok: false, error: "No share" }, { status: 400 });

    // кто я
    const meResp = await fetch(`${process.env.NEXTAUTH_URL}/api/me`, { cache: "no-store" });
    const me = meResp.ok ? await meResp.json() : null;
    const userId = me?.user?.id || me?.id || me?.userId;
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const rec = await prisma.dkgRecoverySession.findUnique({
      where: { id: params.id },
      include: {
        sourceSession: {
          include: {
            participants: true,
            commitments: true, // DkgCommitment[] с JSON [{x,y}...]
          }
        },
        shares: true
      }
    });
    if (!rec) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    if (rec.status !== "OPEN" && rec.status !== "VERIFYING")
      return NextResponse.json({ ok: false, error: "Not accepting shares" }, { status: 409 });

    // участник исходной?
    const srcParts = rec.sourceSession.participants;
    const idx = srcParts.findIndex(p => p.userId === userId); // 0-based
    if (idx === -1) return NextResponse.json({ ok: false, error: "Not a source participant" }, { status: 403 });
    const i = idx + 1; // Shamir index

    // готовим агрегированные коммитменты C*
    const allC: ECPoint[][] = rec.sourceSession.commitments.map(c => {
      const arr: { x: string; y: string }[] = (c.commitments as any) || [];
      return arr.map(p => ({ x: BigInt("0x" + p.x), y: BigInt("0x" + p.y) } as ECPoint));
    });
    const Cstar = aggregateCommitments(allC);

    const s_i = BigInt("0x" + String(sHex).replace(/^0x/i, ""));
    const ok = verifyShare(i, s_i, Cstar);

    await prisma.$transaction(async (tx) => {
      await tx.dkgRecoveryShare.upsert({
        where: { recoveryId_fromUserId: { recoveryId: rec.id, fromUserId: userId } },
        update: { s_i_hex: sHex, proofOk: ok, note: ok ? "" : "feldman-fail" },
        create: { recoveryId: rec.id, fromUserId: userId, s_i_hex: sHex, proofOk: ok },
      });

      const validCount = await tx.dkgRecoveryShare.count({ where: { recoveryId: rec.id, proofOk: true } });
      if (ok && validCount >= rec.t) {
        // здесь можно:
        // 1) реконструировать секрет;
        // 2) расшифровать бэкап и зашифровать результат на requesterPubKey;
        // Ниже — заглушка, вставь свою ECIES
        const sealed = "hex-OR-base64-sealed";
        await tx.dkgRecoverySession.update({
          where: { id: rec.id },
          data: { status: "DONE", resultCiphertext: sealed, resultMeta: JSON.stringify({ kind: "secret-recovery", qHash: rec.qHash }) }
        });
      } else if (rec.status === "OPEN") {
        await tx.dkgRecoverySession.update({ where: { id: rec.id }, data: { status: "VERIFYING" } });
      }
    });

    return NextResponse.json({ ok: true, proofOk: ok });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "SUBMIT failed" }, { status: 500 });
  }
}
