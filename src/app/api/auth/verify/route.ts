// src/app/api/auth/verify/route.ts  ← проверь путь (у тебя был "верифи", я назвал verify)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";                 // ⬅️ используем единый синглтон
import { hashToken } from "@/lib/auth/tokens";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailRaw = searchParams.get("email");
    const token = searchParams.get("token");

    if (!emailRaw || !token) {
      return NextResponse.redirect(new URL("/auth/verified?status=invalid", request.url));
    }

    // Нормализуем e-mail (важно!)
    const email = emailRaw.trim().toLowerCase();

    // Ищем зашифрованный (хэшированный) токен
    const hashed = hashToken(token);
    const vt = await prisma.verificationToken.findFirst({
      where: { identifier: email, token: hashed },
    });

    if (!vt) {
      return NextResponse.redirect(new URL("/auth/verified?status=invalid", request.url));
    }

    // Просрочка
    if (vt.expires < new Date()) {
      // Чистим все связанные токены
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.redirect(new URL("/auth/verified?status=expired", request.url));
    }

    // Убедимся, что пользователь существует
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // На всякий — удалим токены и вернём invalid
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.redirect(new URL("/auth/verified?status=invalid", request.url));
    }

    // Если уже верифицирован, просто почистим токены и вернём ok (идемпотентность)
    if (user.emailVerified) {
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.redirect(new URL("/auth/verified?status=ok", request.url));
    }

    // Атомарно: пометить как верифицированного и удалить все токены этого адреса
    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    ]);

    return NextResponse.redirect(new URL("/auth/verified?status=ok", request.url));
  } catch {
    // На любой сбой — безопасный редирект
    return NextResponse.redirect(new URL("/auth/verified?status=invalid", request.url));
  }
}
