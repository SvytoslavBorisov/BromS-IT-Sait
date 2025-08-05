import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions }       from "@/lib/auth";
import { prisma }           from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jwk } = await request.json();

  await prisma.user.update({
    where: { id: session?.user?.id },
    data: { publicKey: jwk },
  });

  return NextResponse.json({ ok: true });
}