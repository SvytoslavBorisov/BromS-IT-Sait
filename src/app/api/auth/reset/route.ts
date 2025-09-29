import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyHPT } from "@/lib/captcha/hpt";
import crypto from "crypto";
import { hash } from "bcryptjs";
import { cookies } from "next/headers";
import { extractIpUa } from "@/lib/auth/utils";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(req: Request) {
  const makeJson = (body: any, status = 200) => {
    const res = NextResponse.json(body, { status });
    res.headers.set("Cache-Control", "no-store");
    return res;
  };

  try {
    const { email, token, newPassword } = (await req.json().catch(() => ({}))) as {
      email?: string; token?: string; newPassword?: string;
    };

    // 1) HPT со scope auth:reset
    const cookieStore = await cookies();
    const hpt = cookieStore.get("hpt")?.value || "";
    const { ua, ip } = extractIpUa(req);

    if (!verifyHPT(hpt, { ua, ip, requireScope: "auth:reset" })) {
      return makeJson({ ok: false, error: "HPT_REQUIRED" }, 429);
    }

    // 2) Базовая валидация входа
    if (!email || !token || !newPassword || newPassword.length < 8) {
      return makeJson({ ok: false, error: "INVALID_INPUT" }, 400);
    }

    const identifier = normalizeEmail(email);
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 3) Проверка токена
    const rec = await prisma.passwordResetToken.findFirst({
      where: { identifier, token: hashedToken, expires: { gt: new Date() } },
    });
    if (!rec) return makeJson({ ok: false, error: "TOKEN_INVALID" }, 400);

    const user = await prisma.user.findUnique({
      where: { email: identifier },
      select: { id: true },
    });
    if (!user) return makeJson({ ok: false, error: "TOKEN_INVALID" }, 400);

    // 4) Обновляем пароль
    const newHash = await hash(newPassword, 12);
    await prisma.userPassword.upsert({
      where: { userId: user.id },
      update: { hash: newHash },
      create: { userId: user.id, hash: newHash },
    });

    // 5) Инвалидируем все токены сброса этого пользователя
    await prisma.passwordResetToken.deleteMany({ where: { identifier } });

    // (опционально) тут можно инвалидировать активные сессии пользователя

    return makeJson({ ok: true });
  } catch {
    return makeJson({ ok: false, error: "UNKNOWN_ERROR" }, 400);
  }
}
