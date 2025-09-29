import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateVerificationToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/auth/email";

// ▼ ДОБАВЬ:
import { verifyHPT } from "@/lib/captcha/hpt";
import { extractIpUa } from "@/lib/auth/utils";

export async function POST(request: Request) {
  try {
    // ▼ НОВОЕ: проверяем HPT (auth:resend)
    const { ip, ua } = extractIpUa(request);
    const cookie = (request.headers as any)?.get?.("cookie") || "";
    const hpt = cookie.split(/;\s*/).find((c: string) => c.startsWith("hpt="))?.split("=")[1] ?? "";
    if (!hpt || !verifyHPT(hpt, { ua, ip, requireScope: "auth:resend" })) {
      return NextResponse.json({ ok: false, message: "captcha_required" }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email) return NextResponse.json({ ok: false, message: "Укажите email" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });

    // anti-enumeration: отвечаем одинаково
    if (!user || user.emailVerified) {
      return NextResponse.json({
        ok: true,
        message: "Если аккаунт существует и не подтверждён — письмо отправлено.",
      });
    }

    // не спамим, если уже есть неистёкший токен
    const existing = await prisma.verificationToken.findFirst({
      where: { identifier: email, expires: { gt: new Date() } },
    });
    if (existing) {
      return NextResponse.json({
        ok: true,
        message: "Письмо уже отправлялось недавно. Проверьте почту.",
      });
    }

    const { token, hashedToken, expires } = generateVerificationToken(24);
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: { identifier: email, token: hashedToken, expires },
    });

    const origin = process.env.APP_BASE_URL || new URL(request.url).origin;
    const verifyUrl = new URL("/api/auth/verify", origin);
    verifyUrl.searchParams.set("token", token);
    verifyUrl.searchParams.set("email", email);

    await sendVerificationEmail(email, verifyUrl.toString());

    return NextResponse.json({ ok: true, message: "Письмо отправлено. Проверьте почту." });
  } catch {
    return NextResponse.json({ ok: false, message: "Ошибка отправки" }, { status: 400 });
  }
}
