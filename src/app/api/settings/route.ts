import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id }
  });

  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data }
  });

  return NextResponse.json(settings);
}