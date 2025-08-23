import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const session = await getServerSession(authOptions);
  const me = (session as any)?.user?.id as string | undefined;
  if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { Qhash, transcriptHash } = await req.json();

  if (!Qhash) return NextResponse.json({ ok: false, error: "Qhash required" }, { status: 400 });

  await prisma.dkgReady.upsert({
    where: { sessionId_userId: { sessionId: id, userId: me } },
    update: { Qhash, transcriptHash },
    create: { sessionId: id, userId: me, Qhash, transcriptHash },
  });

  return NextResponse.json({ ok: true });
}
