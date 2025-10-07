// src/app/api/auth/register/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { Sex, Prisma } from "@prisma/client";
import { hash as bcryptHash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jwkFingerprint } from "@/lib/crypto/fingerprint";
import { generateVerificationToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/auth/email";
import { verifyHPT } from "@/lib/captcha/hpt";
import { extractIpUa } from "@/lib/auth/utils";
import { cookies } from "next/headers";
import { logger, ensureRequestId } from "@/lib/logger";

import { buildCheckEmailUrl, buildLoginUrl } from "@/lib/auth/register/buildUrls";
import { assertMailruEnvAndLog } from "@/lib/auth/register/mailruEnv";
import { throttleKey, throttleCookieOptions } from "@/lib/auth/register/throttle";
import {
  normalizeEmail,
  ensureEmailAndPassword,
  parseAgeOrNull,
  coerceSexOrNull,
  validatePublicJwk,
} from "@/lib/auth/register/validate";

/** Универсальный безопасный лог ошибок без логических операторов на void */
function logErrorCompat(l: any, err: any, ctx: Record<string, any>) {
  if (typeof l?.logError === "function") {
    l.logError(err, ctx);
  } else if (typeof l?.error === "function") {
    l.error({ ...ctx, error: String(err?.message ?? err) });
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message:
        "POST { email, password, publicKey, name?, surname?, patronymic?, age? (YYYY-MM-DD), sex? (MALE|FEMALE), image?, managerId?, companyId?, positionId?, departmentId?, publicKeyFingerprint? }",
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const origin = process.env.APP_BASE_URL || new URL(request.url).origin;

  // — логгер на запрос
  const requestId = ensureRequestId();
  const log = logger.child({ module: "auth/register", requestId });

  try {
    // 1) HPT (регистрация)
    const { ip, ua } = extractIpUa(request);
    const jar = await cookies(); // ⬅️ async-версия в твоей сборке
    const hptCookie = jar.get("hpt")?.value || "";

    if (!hptCookie || !verifyHPT(hptCookie, { ua, ip, requireScope: "auth:register" })) {
      log.warn({ message: "captcha_required_or_invalid", ip, ua });
      return NextResponse.json({ error: "captcha_required" }, { status: 403 });
    }

    // 2) Параметры
    const body = await request.json().catch(() => ({}));
    const {
      email,
      password,
      name,
      surname,
      patronymic,
      age,
      sex,
      image,
      managerId,
      companyId,
      positionId,
      departmentId,
      publicKey,
    } = body ?? {};

    const normEmail = normalizeEmail(email);
    ensureEmailAndPassword(normEmail, password);
    validatePublicJwk(publicKey);

    log.info({
      message: "register.request.received",
      email: normEmail,
      hasPublicKey: !!publicKey,
      hasPassword: !!password,
    });

    // Уже есть такой e-mail?
    const existing = await prisma.user.findUnique({
      where: { email: normEmail },
      select: { id: true, email: true, emailVerified: true },
    });

    if (existing) {
      // --- Случай А: пользователь существует ---
      if (existing.emailVerified === null) {
        // A1) Не подтверждён: auto-resend (анти-бот + троттлинг)
        const key = throttleKey(normEmail);
        const already = (await cookies()).get(key)?.value === "1";
        if (already) {
          log.warn({ message: "resend_throttled", email: normEmail });

          const res = NextResponse.json(
            {
              ok: false,
              error: "resend_throttled",
              message: "Письмо уже отправлялось недавно. Попробуйте чуть позже.",
              redirectTo: buildCheckEmailUrl(origin, normEmail),
            },
            { status: 429 }
          );
          res.cookies.set(key, "1", throttleCookieOptions);
          return res;
        }

        const resendOk =
          !!hptCookie &&
          (verifyHPT(hptCookie, { ua, ip, requireScope: "auth:resend" }) ||
            verifyHPT(hptCookie, { ua, ip, requireScope: "auth:register" }));

        if (!resendOk) {
          log.warn({ message: "captcha_required_for_resend", email: normEmail });
          return NextResponse.json(
            { ok: false, error: "captcha_required", message: "Подтвердите, что вы не бот." },
            { status: 403 }
          );
        }

        const { token, hashedToken, expires } = generateVerificationToken(24);
        const verifyUrl = new URL("/api/auth/verify", origin);
        verifyUrl.searchParams.set("token", token);
        verifyUrl.searchParams.set("email", normEmail);

        try {
          assertMailruEnvAndLog();

          await prisma.$transaction([
            prisma.verificationToken.deleteMany({ where: { identifier: normEmail } }),
            prisma.verificationToken.create({
              data: { identifier: normEmail, token: hashedToken, expires },
            }),
          ]);

          await sendVerificationEmail(normEmail, verifyUrl.toString());

          log.info({ message: "resend_success", email: normEmail });

          const res = NextResponse.json(
            {
              ok: true,
              message: "Ссылка подтверждения отправлена повторно.",
              redirectTo: buildCheckEmailUrl(origin, normEmail),
            },
            { status: 200 }
          );
          res.cookies.set(key, "1", throttleCookieOptions);
          return res;
        } catch (e: any) {
          logErrorCompat(log, e, { message: "auto_resend_failed", email: normEmail });

          const code = e?.responseCode || e?.code;
          if (code === 535 || code === "EAUTH") {
            return NextResponse.json(
              {
                ok: false,
                error: "email_send_error",
                message:
                  "Mail.ru SMTP аутентификация не прошла. Проверьте MAILRU_USER/MAILRU_PASS.",
                redirectTo: buildCheckEmailUrl(origin, normEmail),
              },
              { status: 502 }
            );
          }
          if (code === "ETIMEDOUT" || String(e?.message || "").toLowerCase().includes("timeout")) {
            return NextResponse.json(
              {
                ok: false,
                error: "email_send_timeout",
                message: "Таймаут при отправке письма через Mail.ru. Повторите позже.",
                redirectTo: buildCheckEmailUrl(origin, normEmail),
              },
              { status: 504 }
            );
          }
          return NextResponse.json(
            {
              ok: false,
              error: "email_send_error",
              message: "Ошибка при повторной отправке письма подтверждения.",
              redirectTo: buildCheckEmailUrl(origin, normEmail),
            },
            { status: 502 }
          );
        }
      } else {
        // A2) Подтверждён: ведём на логин
        log.info({ message: "account_exists_redirect_login", email: normEmail });

        return NextResponse.json(
          {
            ok: true,
            message: "Аккаунт уже есть, войдите.",
            redirectTo: buildLoginUrl(origin, "account-exists"),
          },
          { status: 200 }
        );
      }
    }

    // --- Случай B: новый пользователь ---
    const ageDate: Date | null = parseAgeOrNull(age);
    const sexEnum: Sex | null = coerceSexOrNull(sex);

    // Подготовка
    const passwordHash = await bcryptHash(String(password), 10);
    const fingerprint = await jwkFingerprint(publicKey);
    const { token, hashedToken, expires } = generateVerificationToken(24);
    const verifyUrl = new URL("/api/auth/verify", origin);
    verifyUrl.searchParams.set("token", token);
    verifyUrl.searchParams.set("email", normEmail);

    // Проверим SMTP (Mail.ru) env в этом код-пути
    assertMailruEnvAndLog();

    // Создаём пользователя и токен; если письмо не уйдёт — откатим
    let user: { id: string; email: string } | null = null;

    try {
      user = await prisma.user.create({
        data: {
          email: normEmail,
          name: name ?? null,
          surname: surname ?? null,
          patronymic: patronymic ?? null,
          age: ageDate,
          sex: sexEnum,
          image: image ?? null,
          managerId: managerId || null,
          companyId: companyId || null,
          positionId: positionId || null,
          departmentId: departmentId || null,
          e2ePublicKey: publicKey as Prisma.JsonObject,
          e2ePublicKeyAlg: "ECIES-GOST-2012-256",
          e2ePublicKeyFingerprint: fingerprint,
          password: { create: { hash: passwordHash } },
          emailVerified: null,
        },
        select: { id: true, email: true },
      });

      await prisma.$transaction([
        prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
        prisma.verificationToken.create({
          data: { identifier: user.email, token: hashedToken, expires },
        }),
      ]);

      await sendVerificationEmail(user.email, verifyUrl.toString());

      log.info({ message: "register_success_email_sent", userId: user.id, email: user.email });

      return NextResponse.json(
        {
          ok: true,
          message: "Регистрация принята. Проверьте e-mail и подтвердите адрес.",
          redirectTo: buildCheckEmailUrl(origin, user.email),
        },
        { status: 201 }
      );
    } catch (e: any) {
      // Попробуем откатить
      if (user) {
        try {
          await prisma.$transaction([
            prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
            prisma.user.delete({ where: { id: user.id } }),
          ]);
        } catch (cleanupErr) {
          log.warn({ message: "cleanup_after_email_send_failure_failed", error: String(cleanupErr) });
        }
      }

      const code = e?.responseCode || e?.code;
      if (code === 535 || code === "EAUTH") {
        log.error({ message: "smtp_auth_failed", code, email: normEmail });
        return NextResponse.json(
          {
            ok: false,
            error: "email_send_error",
            message:
              "Mail.ru SMTP аутентификация не прошла. Проверьте MAILRU_USER/MAILRU_PASS.",
          },
          { status: 502 }
        );
      }
      if (code === "ETIMEDOUT" || String(e?.message || "").toLowerCase().includes("timeout")) {
        log.error({ message: "smtp_timeout", email: normEmail });
        return NextResponse.json(
          {
            ok: false,
            error: "email_send_timeout",
            message: "Таймаут при отправке письма через Mail.ru. Повторите позже.",
          },
          { status: 504 }
        );
      }

      logErrorCompat(log, e, { message: "send_verification_email_failed", email: normEmail });

      return NextResponse.json(
        { ok: false, error: "email_send_error", message: "Ошибка при отправке письма подтверждения." },
        { status: 502 }
      );
    }
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    const message = status === 500 ? "Внутренняя ошибка сервера" : String(error?.message || "Ошибка запроса");

    logErrorCompat(logger as any, error, { module: "auth/register", requestId, message: "register_unhandled_error" });

    return NextResponse.json({ error: message }, { status });
  }
}
