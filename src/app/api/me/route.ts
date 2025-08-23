// src/app/api/me/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true,
      e2ePublicKey: true, e2ePublicKeyAlg: true,
      company: { select: { id: true, title: true } },
      department: { select: { id: true, title: true } },
      manager: { select: { id: true, name: true } },
      position: { select: { id: true, title: true } },
    },
  });

  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  return NextResponse.json({ ok: true, user });
}
