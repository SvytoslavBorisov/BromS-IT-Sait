import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jwkFingerprint } from "@/lib/crypto/fingerprint";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { jwk, alg } = await request.json();

  // 1. Проверка, есть ли уже ключ
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { e2ePublicKey: true },
  });
  if (existing?.e2ePublicKey) {
    return NextResponse.json(
      { error: "Public key already set" },
      { status: 409 }
    );
  }

  // 2. Валидация JWK
  if (!jwk || jwk.kty !== "EC" || jwk.crv !== "GOST-2012-256") {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }
  if (!jwk.x || !jwk.y) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }
  if (jwk.d) {
    return NextResponse.json({ error: "Private key not allowed" }, { status: 400 });
  }

  // 3. Пересчитать отпечаток
  const fingerprint = await jwkFingerprint(jwk);

  // 4. Сохранить
  await prisma.user.update({
    where: { id: userId },
    data: {
      e2ePublicKey: jwk,
      e2ePublicKeyAlg: alg || "ECIES-GOST-2012-256",
      e2ePublicKeyFingerprint: fingerprint,
    },
  });

  return NextResponse.json({ ok: true });
}
