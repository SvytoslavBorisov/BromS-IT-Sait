// src/app/api/dkg/sessions/[id]/commitments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { H256 } from "@/lib/crypto/hmac_gost";
import { enc } from "@/lib/crypto/bigint-utils";

type Point = { x: string; y: string };
type CommitmentMsg = { from: string; commitments: Point[]; signature: string };

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const body = (await req.json()) as CommitmentMsg;
  if (!body?.from || !Array.isArray(body.commitments) || !body.signature) {
    return NextResponse.json({ ok: false, error: "Bad payload" }, { status: 400 });
  }

  // быстрый хеш сериализованных коммитментов (для сверки на клиенте)
  const ser = enc.encode(JSON.stringify(body.commitments));
  const commitmentsHash = Buffer.from(H256(ser)).toString("hex");

  try {
    // идемпотентно: если уже есть запись — обновим её (или можно вернуть 409, см. ниже)
    const rec = await prisma.dkgCommitment.upsert({
      where: { sessionId_fromUserId: { sessionId: id, fromUserId: body.from } },
      update: {
        commitments: body.commitments,
        commitmentsHash,
        signature: body.signature,
      },
      create: {
        sessionId: id,
        fromUserId: body.from,
        commitments: body.commitments,
        commitmentsHash,
        signature: body.signature,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: rec.id, commitmentsHash });
  } catch (e: any) {
    // fallback: если всё-таки дойдёт до дубликата — вернём 409, а не 500
    if (e?.code === "P2002") {
      return NextResponse.json({ ok: false, error: "Commitments already published" }, { status: 409 });
    }
    throw e;
  }
}
