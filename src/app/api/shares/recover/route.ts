import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions }      from "@/app/api/auth/[...nextauth]/route";
import { prisma }           from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url       = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const shamirSession = await prisma.shamirSession.findUnique({
    where: { id: sessionId },
    select: { prime: true, threshold: true },
  });
  if (!shamirSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const shares = await prisma.share.findMany({
    where: {
      sessionId:   sessionId,
      userId: session.user.id,
    },
    select: { x: true, ciphertext: true },
  });

  return NextResponse.json({
    prime:     shamirSession.prime,
    threshold: shamirSession.threshold,
    shares,
  });
}