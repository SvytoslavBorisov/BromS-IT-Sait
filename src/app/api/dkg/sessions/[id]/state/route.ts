// src/app/api/dkg/sessions/[id]/state/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const [ses, parts, cmts, outboxRaw, ready] = await Promise.all([
    prisma.dkgSession.findUnique({ where: { id } }),
    prisma.dkgParticipant.findMany({ where: { sessionId: id } }),
    prisma.dkgCommitment.findMany({ where: { sessionId: id } }),
    prisma.dkgShareOutbox.findMany({ where: { sessionId: id } }),
    prisma.dkgReady.findMany({ where: { sessionId: id } }),
  ]);

  // Трансформируем outbox: bytea -> utf8 string
  const outbox = outboxRaw.map((m:any) => {
    let combined = "";
    const c = m.ciphertext;
    if (typeof c === "string") combined = c;
    else if (c?.type === "Buffer" && Array.isArray(c.data)) combined = Buffer.from(c.data).toString("utf8");
    else if (c instanceof Uint8Array) combined = Buffer.from(c).toString("utf8");
    else if (Buffer.isBuffer?.(c)) combined = c.toString("utf8");

    const { ciphertext, ...rest } = m;
    return { ...rest, ciphertextCombined: combined };
  });
  return NextResponse.json({ ses, parts, cmts, outbox, ready });
}
