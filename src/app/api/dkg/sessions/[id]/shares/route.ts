// src/app/api/dkg/sessions/[id]/shares/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DkgShareDelivery } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type ShareMsg = {
  from: string;
  to: string;
  ciphertextCombined: string;   // ⬅️ единое поле
  transcriptHash: string;
  signature: string;
};

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  const me = (session as any)?.user?.id as string | undefined;
  if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as ShareMsg;
  if (!body?.from || !body?.to || !body?.ciphertextCombined || !body?.transcriptHash || !body?.signature) {
    return NextResponse.json({ ok: false, error: "Bad payload" }, { status: 400 });
  }
  if (body.from !== me) {
    return NextResponse.json({ ok: false, error: "Sender mismatch" }, { status: 403 });
  }

  // Проверим, что оба участника в комнате
  const [pFrom, pTo] = await Promise.all([
    prisma.dkgParticipant.findUnique({ where: { sessionId_userId: { sessionId: id, userId: body.from } } }),
    prisma.dkgParticipant.findUnique({ where: { sessionId_userId: { sessionId: id, userId: body.to } } }),
  ]);
  if (!pFrom || !pTo) {
    return NextResponse.json({ ok: false, error: "Both participants must join session first" }, { status: 400 });
  }

  // Сохраняем строку как bytea (UTF-8)
  const buf = Buffer.from(body.ciphertextCombined, "utf8");

  const rec = await prisma.dkgShareOutbox.create({
    data: {
      sessionId: id,
      fromUserId: body.from,
      toUserId: body.to,
      ciphertext: buf,              // bytea
      transcriptHash: body.transcriptHash,
      signature: body.signature,
      status: DkgShareDelivery.SENT,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: rec.id });
}
