import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"; // поправь путь если у тебя другой

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  const certifications = await prisma.certification.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });

  console.log(certifications)

  return NextResponse.json(certifications);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, pem, asymmetricKeyId } = await request.json();

    if (!pem || typeof pem !== "string") {
      return NextResponse.json({ error: "pem is required" }, { status: 400 });
    }

    // простая валидация формата + ограничение размера
    if (!/-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----/.test(pem)) {
      return NextResponse.json({ error: "Invalid PEM" }, { status: 400 });
    }
    if (pem.length > 200_000) { // ~200 KB на всякий случай
      return NextResponse.json({ error: "Certificate is too large" }, { status: 413 });
    }

    const created = await prisma.certification.create({
      data: {
        title: (title && String(title).slice(0, 200)) || "Сертификат",
        pem,
        ownerId: session.user.id,
        // если надо привязывать к ключу:
        ...(asymmetricKeyId ? { asymmetricKeyId } : {}),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    console.error(e);
    // Обработка уникальности asymmetricKeyId, если вдруг пришёл
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "This asymmetricKeyId is already bound to another certificate" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}