// src/app/api/auth/resend-verification/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateVerificationToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/auth/email"; 
import { verifyHPT } from "@/lib/captcha/hpt";
import { extractIpUa } from "@/lib/auth/utils";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    // 1) HPT: берём как в регистрации — через cookies(), плюс fallback из заголовка
    const { ip, ua } = extractIpUa(request);

    const cookieStore = await cookies();
    const cookieHpt = cookieStore.get("hpt")?.value ?? "";

    const hdrHpt =
      (request.headers as any)?.get?.("x-hpt")?.toString?.() ?? "";

    const hpt = hdrHpt || cookieHpt;

    if (!hpt || !verifyHPT(hpt, { ua, ip, requireScope: "auth:resend" })) {
      // В регистрации ты возвращаешь 403 при captcha_required — делаем так же
      return NextResponse.json({ ok: false, message: "captcha_required" }, { status: 403 });
    }

    // 2) Параметры
    const { email } = await request.json().catch(() => ({} as any));
    if (!email) {
      return NextResponse.json({ ok: false, message: "Укажите email" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // 3) Анти-энумерация: одинаковый ответ
    if (!user || user.emailVerified) {
      return NextResponse.json({
        ok: true,
        message: "Если аккаунт существует и не подтверждён — письмо отправлено.",
      });
    }

    // 4) Не спамим, если есть неистёкший
    const existing = await prisma.verificationToken.findFirst({
      where: { identifier: email, expires: { gt: new Date() } },
    });
    if (existing) {
      return NextResponse.json({
        ok: true,
        message: "Письмо уже отправлялось недавно. Проверьте почту.",
      });
    }

    // 5) Генерация нового токена
    const { token, hashedToken, expires } = generateVerificationToken(24);
    await prisma.$transaction([
      prisma.verificationToken.deleteMany({ where: { identifier: email } }),
      prisma.verificationToken.create({
        data: { identifier: email, token: hashedToken, expires },
      }),
    ]);

    // 6) Ссылка подтверждения
    const origin = process.env.APP_BASE_URL || new URL(request.url).origin;
    const verifyUrl = new URL("/api/auth/verify", origin);
    verifyUrl.searchParams.set("token", token);
    verifyUrl.searchParams.set("email", email);

    await sendVerificationEmail(email, verifyUrl.toString());

    return NextResponse.json({
      ok: true,
      message: "Письмо отправлено. Проверьте почту.",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: "Ошибка отправки" },
      { status: 400 },
    );
  }
}
