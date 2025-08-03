import { NextResponse } from 'next/server';
import { prisma }       from '@/lib/prisma';

/**
 * GET /api/users/:id/pubkey
 * Ответ: { jwk: JsonWebKey }
 */

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;
  // 1) Найдём пользователя и его publicKey
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { publicKey: true }
  });
  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }
  if (!user.publicKey) {
    return NextResponse.json(
      { error: 'No publicKey for this user' },
      { status: 404 }
    );
  }

  // 2) Отдаём JWK
  return NextResponse.json({ jwk: user.publicKey });
}