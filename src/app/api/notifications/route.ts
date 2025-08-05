import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession }     from "next-auth/next";
import { authOptions }          from "@/app/api/auth/[...nextauth]/route";
import { NextResponse }         from "next/server";

export const GET = async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // читаем последние 100 уведомлений (по желанию можно пагинацию)
  const notifs = await prisma.notification.findMany({
    where: { userId: session?.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return new Response(JSON.stringify(notifs), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};