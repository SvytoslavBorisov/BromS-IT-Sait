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
      // единый ответ без утечки деталей
      return makeJson({ ok: false, error: "HPT_REQUIRED" }, 429);
    }

    // 2) Не выдаём, существует ли email
    if (!email) {
      return makeJson({ ok: true, message: "Если адрес найден, мы отправили письмо" });
    }

    const identifier = normalizeEmail(email);

    const user = await prisma.user.findUnique({
      where: { email: identifier },
      select: { id: true },
    });

    // Всегда отвечаем одинаково
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
    const base = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL!;
    const url =
      `${base.replace(/\/+$/, "")}/auth/reset` +
      `?email=${encodeURIComponent(identifier)}&token=${encodeURIComponent(rawToken)}`;

    await sendPasswordResetEmail(identifier, url);

    return makeJson({ ok: true, message: "Если адрес найден, мы отправили письмо" });
  } catch {
    // Никогда не раскрываем детали
    return makeJson({ ok: true, message: "Если адрес найден, мы отправили письмо" });
  }
}
