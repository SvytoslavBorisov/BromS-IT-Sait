// src/app/api/me/shares/route.ts

import { NextResponse }     from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions }      from "@/app/api/auth/[...nextauth]/route";
import { prisma }           from "@/lib/prisma";

export async function GET(req: Request) {
  // 1) Проверяем сессию
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // 2) Достаём из БД все доли этого пользователя,
  //    вместе с их VSS-сессией (p, q, g, commitments, dealerId)
  const shares = await prisma.share.findMany({
    where: { userId },
    orderBy: { x: "asc" },
    select: {
      id: true,
      x: true,
      ciphertext: true,
      status: true,
      comment: true,
      encryptionAlgorithm: true,
      createdAt: true,
      expiresAt: true,
      session: {
        select: {
          p: true,
          q: true,
          g: true,
          commitments: true,
          dealerId: true,
        }
      }
    }
  });

  // 3) Отдаём клиенту JSON-массив
  return NextResponse.json(shares);
}
