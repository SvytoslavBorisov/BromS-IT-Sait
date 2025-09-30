export const runtime = "nodejs";         // ← важно, чтобы не уехать в Edge
export const dynamic = "force-dynamic";  // ← не кэшировать/не пререндерить
export const revalidate = 0;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/tokens";

// небольшой хелпер, чтобы не ошибиться с базой редиректа
function toApp(url: string | URL, reqUrl: string) {
  return new URL(url, new URL(reqUrl).origin);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailRaw = searchParams.get("email");
    const token = searchParams.get("token");

    if (!emailRaw || !token || token.length > 512) {
      return NextResponse.redirect(toApp("/auth/verified?status=invalid", request.url));
    }

    const email = emailRaw.trim().toLowerCase();

    const hashed = hashToken(token);
    const vt = await prisma.verificationToken.findFirst({
      where: { identifier: email, token: hashed },
    });

    if (!vt) {
      return NextResponse.redirect(toApp("/auth/verified?status=invalid", request.url));
    }

    if (vt.expires < new Date()) {
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.redirect(toApp("/auth/verified?status=expired", request.url));
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.redirect(toApp("/auth/verified?status=invalid", request.url));
    }

    if (user.emailVerified) {
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.redirect(toApp("/auth/verified?status=ok", request.url));
    }

    await prisma.$transaction([
      prisma.user.update({ where: { email }, data: { emailVerified: new Date() } }),
      prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    ]);

    return NextResponse.redirect(toApp("/auth/verified?status=ok", request.url));
  } catch (e) {
    // можно залогировать e для диагностики
    return NextResponse.redirect(toApp("/auth/verified?status=invalid", request.url));
  }
}