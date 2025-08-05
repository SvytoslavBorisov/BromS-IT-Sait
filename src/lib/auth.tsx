import { getSession } from 'next-auth/react';
import { prisma } from '@/lib/prisma';
import { NextApiRequest } from 'next'

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}