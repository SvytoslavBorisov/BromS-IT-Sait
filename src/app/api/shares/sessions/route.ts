import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions }      from "@/app/api/auth/[...nextauth]/route";
import { prisma }           from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.shamirSession.findMany({
    where: { dealerId: session.user.id },
    select: { id: true, createdAt: true, threshold: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sessions);
}