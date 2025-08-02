import { NextResponse } from 'next/server';
import { prisma }       from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions }     from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: Request) {
  // при необходимости проверяем, что пользователь аутентифицирован:
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Получаем из БД всех пользователей с publicKey
  const participants = await prisma.user.findMany({
    where: { publicKey: { not: null } },
    select: {
      id: true,
      publicKey: true,
    },
  });

  return NextResponse.json(participants);
}