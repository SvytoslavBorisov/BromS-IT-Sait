import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions }       from "@/lib/auth";
import { prisma }           from "@/lib/prisma";


export async function GET(req: Request) {
  // 1) Проверяем сессию
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
        company: { 
        select: {
            id: true, title: true
        }
        },
        department: { 
        select: {
            id: true, title: true
        }
        },
        manager: {
        select: {
            id: true, name: true
        }
        }
    }
  });

  // 3) Отдаём клиенту JSON-массив
  return NextResponse.json(user);
}
