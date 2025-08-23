import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

type JoinBody = { e2ePublicKey?: string; e2ePublicKeyAlg?: string; isHost?: boolean };

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { e2ePublicKey, e2ePublicKeyAlg, isHost } = (await req.json().catch(() => ({}))) as JoinBody;

  const profile = await prisma.user.findUnique({ where: { id: userId }, select: { e2ePublicKey: true, e2ePublicKeyAlg: true } });
  const pk = e2ePublicKey ?? profile?.e2ePublicKey;
  const alg = e2ePublicKeyAlg ?? profile?.e2ePublicKeyAlg ?? "ECIES-GOST-2012-256";
  if (!pk) return NextResponse.json({ ok: false, error: "Missing e2ePublicKey" }, { status: 400 });

  const rec = await prisma.dkgParticipant.upsert({
    where: { sessionId_userId: { sessionId: id, userId } },
    update: { e2ePublicKey: pk, e2ePublicKeyAlg: alg, leftAt: null, isHost: Boolean(isHost) },
    create: { sessionId: id, userId, e2ePublicKey: pk, e2ePublicKeyAlg: alg, isHost: Boolean(isHost) },
    select: { sessionId: true, userId: true, e2ePublicKey: true },
  });

  return NextResponse.json({ ok: true, participant: rec });
}
