// src/app/api/users/e2e/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const me = (session as any)?.user?.id as string | undefined;
  const { e2ePublicKey, e2ePublicKeyAlg } = await req.json();
  if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  if (!e2ePublicKey) return NextResponse.json({ ok: false, error: "e2ePublicKey required" }, { status: 400 });

  await prisma.user.update({
    where: { id: me },
    data: { e2ePublicKey, e2ePublicKeyAlg: e2ePublicKeyAlg ?? "ECIES-GOST-2012-256" },
  });
  return NextResponse.json({ ok: true });
}
