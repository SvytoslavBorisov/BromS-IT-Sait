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
import { withTimeout } from "@/lib/auth/email-timeout";


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

    // Проверка, что пользователя ещё нет
    const existing = await prisma.user.findUnique({
      where: { email: normEmail },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    // Приведение даты рождения
    let ageDate: Date | null = null;
    if (age) {
      const d = new Date(age);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          {
            error:
              "Поле age должно быть корректной датой (например, 1999-12-31)",
          },
          { status: 400 }
        );
      }
      ageDate = d;
    }

    // Валидация пола
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

    // Валидация JWK (публичный ключ ГОСТ-2012-256)
    // Требуем EC-кривую ГОСТ-2012-256, координаты x/y и отсутствие d (приватника)
    if (publicKey.kty !== "EC") {
      return NextResponse.json(
        { error: "JWK.kty должен быть 'EC'" },
        { status: 400 }
      );
    }
    if (publicKey.crv !== "GOST-2012-256") {
      return NextResponse.json(
        { error: "JWK.crv должен быть 'GOST-2012-256'" },
        { status: 400 }
      );
    }
    if (!publicKey.x || !publicKey.y) {
      return NextResponse.json(
        { error: "JWK должен содержать координаты x и y" },
        { status: 400 }
      );
    }
    if (publicKey.d) {
      return NextResponse.json(
        { error: "Публичный JWK не должен содержать поле d" },
        { status: 400 }
      );
    }

    const passwordHash = await bcryptHash(password, 10);
    const fingerprint = await jwkFingerprint(publicKey);

    // 4) Создание пользователя
    const user = await prisma.user.create({
      data: {
        email: normEmail,
        name: name ?? null,
        surname: surname ?? null,
        patronymic: patronymic ?? null,
        age: age ? new Date(age) : null,
        sex: sex ? (String(sex).toUpperCase() as Sex) : null,
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

    // 5) Токен верификации + письмо с таймаутом
    const { token, hashedToken, expires } = generateVerificationToken(24);
    await prisma.$transaction([
      prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
      prisma.verificationToken.create({ data: { identifier: user.email, token: hashedToken, expires } }),
    ]);

    const origin = process.env.APP_BASE_URL || new URL(request.url).origin;
    const verifyUrl = new URL("/api/auth/verify", origin);
    verifyUrl.searchParams.set("token", token);
    verifyUrl.searchParams.set("email", user.email);

    void withTimeout(sendVerificationEmail(user.email, verifyUrl.toString()), 4000, "sendVerificationEmail")
      .then(ok => { if (!ok) console.warn("sendVerificationEmail timeout/failed for", user.email); });

    // 6) Ответ мгновенно
    return NextResponse.json(
      { ok: true, message: "Регистрация принята. Проверьте e-mail и подтвердите адрес." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Ошибка при регистрации:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}