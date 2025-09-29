import { NextResponse } from "next/server";
import { Sex, Prisma } from "@prisma/client";
import { hash as bcryptHash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { jwkFingerprint } from "@/lib/crypto/fingerprint";
import { generateVerificationToken } from "@/lib/auth/tokens";
import { sendVerificationEmail } from "@/lib/auth/email";

// ▼ ДОБАВЬ:
import { verifyHPT } from "@/lib/captcha/hpt";
import { extractIpUa } from "@/lib/auth/utils";

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
    // ▼ НОВОЕ: проверяем HPT (auth:register)
    const { ip, ua } = extractIpUa(request);
    // ОСТАВЛЕНО КАК ЕСТЬ (без пункта 2): парсим cookie вручную из заголовка
    const cookie = (request.headers as any)?.get?.("cookie") || "";
    const hpt =
      cookie
        .split(/;\s*/)
        .find((c: string) => c.startsWith("hpt="))
        ?.split("=")[1] ?? "";

    if (!hpt || !verifyHPT(hpt, { ua, ip, requireScope: "auth:register" })) {
      return NextResponse.json({ error: "captcha_required" }, { status: 403 });
    }

    const body = await request.json();
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

    // Нормализация email
    const normEmail = String(email ?? "").trim().toLowerCase();

    // Базовая валидация
    if (!normEmail || !password) {
      return NextResponse.json(
        { error: "Поля email и password обязательны" },
        { status: 400 }
      );
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

    // Хэш пароля (UserPassword)
    const passwordHash = await bcryptHash(password, 10);

    // Отпечаток ключа (считаем на сервере)
    const fingerprint = await jwkFingerprint(publicKey);

    // Создаём пользователя (emailVerified оставляем null до подтверждения)
    const user = await prisma.user.create({
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

        // ГОСТ-транспортный публичный ключ
        e2ePublicKey: publicKey as Prisma.JsonObject, // Json
        e2ePublicKeyAlg: "ECIES-GOST-2012-256",
        e2ePublicKeyFingerprint: fingerprint, // String @unique

        // Пароль — через связанную сущность
        password: { create: { hash: passwordHash } },

        emailVerified: null,
      },
      select: { id: true, email: true },
    });

    // === Создаём verification token и отправляем письмо ===
    const { token, hashedToken, expires } = generateVerificationToken(24);

    // Один активный токен на email: атомарно чистим и создаём новый
    await prisma.$transaction([
      prisma.verificationToken.deleteMany({
        where: { identifier: user.email },
      }),
      prisma.verificationToken.create({
        data: {
          identifier: user.email,
          token: hashedToken,
          expires,
        },
      }),
    ]);

    // Сборка абсолютной ссылки на verify-роут
    const origin = process.env.APP_BASE_URL || new URL(request.url).origin;
    const verifyUrl = new URL("/api/auth/verify", origin);
    verifyUrl.searchParams.set("token", token);
    verifyUrl.searchParams.set("email", user.email);

    // Отправляем письмо
    await sendVerificationEmail(user.email, verifyUrl.toString());

    // Возвращаем нейтральный ответ (не логиним до подтверждения)
    return NextResponse.json(
      {
        ok: true,
        message:
          "Регистрация принята. Проверьте e-mail и подтвердите адрес, чтобы войти.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Ошибка при регистрации:", error);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
