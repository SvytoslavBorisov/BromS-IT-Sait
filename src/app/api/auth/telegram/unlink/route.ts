import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      telegramId: null,
      telegramUsername: null,
      telegramPhotoUrl: null,
      telegramLanguageCode: null,
      telegramAllowsWrite: false,
      telegramLinkedAt: null,
      telegramLastAuthAt: null,
    },
  });
  return NextResponse.json({ ok: true });
}
