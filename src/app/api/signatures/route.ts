import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Все подписи текущего пользователя ИЛИ, если нужно, админ может видеть все.
  // Если надо только свои — раскомментируй where: { userId: session.user.id }
  const signatures = await prisma.signatures.findMany({
    // where: { userId: session.user.id },
    include: {
      document: {
        select: { id: true, fileName: true, fileType: true, fileSize: true },
      },
      user: {
        select: { id: true, name: true, surname: true, email: true, image: true },
      },
    },
    orderBy: { id: "desc" }, // нет createdAt — сортируем по id
  });

  return NextResponse.json(signatures);
}
