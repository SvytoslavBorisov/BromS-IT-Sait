// src/app/api/auth/forgot/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyHPT } from "@/lib/captcha/hpt";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/auth/email";
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
    const { email } = (await req.json().catch(() => ({}))) as { email?: string };

    // 1) Проверка HPT (HttpOnly cookie, scope auth:forgot)
    const cookieStore = await cookies();
    const hpt = cookieStore.get("hpt")?.value || "";
    const { ua, ip } = extractIpUa(req);

    if (!verifyHPT(hpt, { ua, ip, requireScope: "auth:forgot" })) {
      return makeJson({ ok: false, error: "HPT_REQUIRED" }, 429);
    }

    // 2) Если email не передан — отвечаем одинаково (без утечек)
    if (!email) {
      return makeJson({ ok: true, message: "Если адрес найден, мы отправили письмо" });
    }

    const identifier = normalizeEmail(email);

    const user = await prisma.user.findUnique({
      where: { email: identifier },
      select: { id: true, emailVerified: true },
    });

    // 2.1) По твоей просьбе: если пользователь найден, но email не подтверждён — сообщаем явно.
    // (Это намеренная "утечка" факта существования, ты её запросил.)
    if (user && !user.emailVerified) {
      return makeJson(
        {
          ok: false,
          error: "EMAIL_NOT_VERIFIED",
          message: "E-mail не подтверждён. Сначала подтвердите адрес.",
        },
        400
      );
    }

    // 2.2) Если не найден — отвечаем без утечек
    if (!user) {
      return makeJson({ ok: true, message: "Если адрес найден, мы отправили письмо" });
    }

    // 3) Одноразовый токен
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 час

    await prisma.passwordResetToken.deleteMany({ where: { identifier } }).catch(() => {});
    await prisma.passwordResetToken.create({
      data: { identifier, token: hashed, expires },
    });

    // 4) Ссылка
    const base = (process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
    const url =
      `${base}/auth/reset` +
      `?email=${encodeURIComponent(identifier)}&token=${encodeURIComponent(rawToken)}`;

    await sendPasswordResetEmail(identifier, url);

    return makeJson({ ok: true, message: "Если адрес найден, мы отправили письмо" });
  } catch {
    // Никогда не раскрываем детали
    return makeJson({ ok: true, message: "Если адрес найден, мы отправили письмо" });
  }
}
