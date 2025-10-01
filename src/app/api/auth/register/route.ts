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
// ⬇️ шлём через Mail.ru
import { sendVerificationEmail } from "@/lib/auth/email_mail";
import { verifyHPT } from "@/lib/captcha/hpt";
import { extractIpUa } from "@/lib/auth/utils";
import { cookies } from "next/headers";
import { createHash } from "crypto";

/** Проверяем, что заданы переменные окружения для SMTP Mail.ru и логируем без утечек */
function assertMailruEnvAndLog() {
  const user = (process.env.MAILRU_USER || "").trim();
  const pass = (process.env.MAILRU_PASS || "").trim();
  const port = Number(process.env.MAILRU_PORT || 465);
  const host = "smtp.mail.ru";

  if (!user) throw new Error("MAILRU_USER is not set");
  if (!pass) throw new Error("MAILRU_PASS is not set");
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("MAILRU_PORT is not a valid number");
  }

  const sha = createHash("sha256").update(pass).digest("hex");
  console.log(
    `[register] Mail.ru SMTP env ok: host=${host} user=${user} port=${port} pass.len=${pass.length} pass.sha256=${sha}`
  );
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
  try {
    // 1) HPT
    const { ip, ua } = extractIpUa(request);
    const hpt = (await cookies()).get("hpt")?.value || "";
    if (!hpt || !verifyHPT(hpt, { ua, ip, requireScope: "auth:register" })) {
      return NextResponse.json({ error: "captcha_required" }, { status: 403 });
    }

    // 2) Параметры
    const body = await request.json();
    const {
      email, password, name, surname, patronymic, age, sex, image,
      managerId, companyId, positionId, departmentId, publicKey,
    } = body ?? {};

    const normEmail = String(email ?? "").trim().toLowerCase();
    if (!normEmail || !password) {
      return NextResponse.json({ error: "Поля email и password обязательны" }, { status: 400 });
    }
    if (!publicKey || typeof publicKey !== "object") {
      return NextResponse.json(
        { error: "Отсутствует или некорректен publicKey (JWK)" },
        { status: 400 }
      );
    }

    // Уже есть такой e-mail?
    const existing = await prisma.user.findUnique({ where: { email: normEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    // age
    let ageDate: Date | null = null;
    if (age) {
      const d = new Date(age);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "Поле age должно быть корректной датой (например, 1999-12-31)" },
          { status: 400 }
        );
      }
      ageDate = d;
    }

    // sex
    let sexEnum: Sex | null = null;
    if (sex !== undefined && sex !== null) {
      const upper = String(sex).toUpperCase();
      if (upper !== "MALE" && upper !== "FEMALE") {
        return NextResponse.json(
          { error: "Поле sex должно быть 'MALE' или 'FEMALE'" },
          { status: 400 }
        );
      }
      sexEnum = upper as Sex;
    }

    // JWK ГОСТ-2012-256
    if (publicKey.kty !== "EC") return NextResponse.json({ error: "JWK.kty должен быть 'EC'" }, { status: 400 });
    if (publicKey.crv !== "GOST-2012-256") return NextResponse.json({ error: "JWK.crv должен быть 'GOST-2012-256'" }, { status: 400 });
    if (!publicKey.x || !publicKey.y) return NextResponse.json({ error: "JWK должен содержать координаты x и y" }, { status: 400 });
    if (publicKey.d) return NextResponse.json({ error: "Публичный JWK не должен содержать поле d" }, { status: 400 });

    // Подготовка
    const passwordHash = await bcryptHash(password, 10);
    const fingerprint = await jwkFingerprint(publicKey);
    const origin = process.env.APP_BASE_URL || new URL(request.url).origin;

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
        prisma.verificationToken.create({ data: { identifier: user.email, token: hashedToken, expires } }),
      ]);

      // ⬇️ Отправляем письмо через Mail.ru
      await sendVerificationEmail(user.email, verifyUrl.toString());

      return NextResponse.json(
        { ok: true, message: "Регистрация принята. Проверьте e-mail и подтвердите адрес." },
        { status: 201 }
      );
    } catch (e: any) {
      if (user) {
        try {
          await prisma.$transaction([
            prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
            prisma.user.delete({ where: { id: user.id } }),
          ]);
        } catch (cleanupErr) {
          console.error("Cleanup after email send failure failed:", cleanupErr);
        }
      }

      const code = e?.responseCode || e?.code;
      if (code === 535 || code === "EAUTH") {
        return NextResponse.json(
          { ok: false, error: "email_send_error", message: "Mail.ru SMTP аутентификация не прошла. Проверьте MAILRU_USER/MAILRU_PASS." },
          { status: 502 }
        );
      }
      if (code === "ETIMEDOUT" || String(e?.message || "").toLowerCase().includes("timeout")) {
        return NextResponse.json(
          { ok: false, error: "email_send_timeout", message: "Таймаут при отправке письма через Mail.ru. Повторите позже." },
          { status: 504 }
        );
      }
      console.error("sendVerificationEmail (Mail.ru) failed:", e);
      return NextResponse.json(
        { ok: false, error: "email_send_error", message: "Ошибка при отправке письма подтверждения." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Ошибка при регистрации:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
