// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { PrismaClient, Sex } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

export async function GET() {
  return NextResponse.json(
    { message: "POST { email, password, publicKey, name?, surname?, patronymic?, age? (YYYY-MM-DD), sex? (MALE|FEMALE), image?, managerId?, companyId?, positionId?, departmentId?, publicKeyFingerprint? }" },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      email,
      password,
      name,
      surname,
      patronymic,
      age,                  // 'YYYY-MM-DD'
      sex,
      image,
      managerId,
      companyId,
      positionId,
      departmentId,
      publicKey,            // ОТ КЛИЕНТА: публичный JWK (объект)
    } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Поля email и password обязательны" },
        { status: 400 }
      );
    }
    if (!publicKey) {
      return NextResponse.json(
        { error: "Отсутствует publicKey. Ключевая пара должна генерироваться на клиенте" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    // Пароль -> hash
    const passwordHash = await hash(password, 10);

    // Приведение даты
    let ageDate: Date | undefined = undefined;
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

    // Валидируем sex
    let sexEnum: Sex | undefined = undefined;
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

    // publicKey должен быть объектом
    if (typeof publicKey !== "object") {
      return NextResponse.json(
        { error: "publicKey должен быть объектом JWK" },
        { status: 400 }
      );
    }

    // (опционально) быстрая sanity‑проверка JWK
    // например, требуем kty
    if (!publicKey.kty) {
      return NextResponse.json(
        { error: "Некорректный JWK: отсутствует поле kty" },
        { status: 400 }
      );
    }

    const data: any = {
      email,
      passwordHash,
      publicKey,
      ...(name ? { name } : {}),
      ...(surname !== undefined ? { surname } : {}),
      ...(patronymic !== undefined ? { patronymic } : {}),
      ...(ageDate ? { age: ageDate } : {}),
      ...(sexEnum ? { sex: sexEnum } : {}),
      ...(image ? { image } : {}),
      ...(managerId ? { managerId } : {}),
      ...(companyId ? { companyId } : {}),
      ...(positionId ? { positionId } : {}),
      ...(departmentId ? { departmentId } : {}),
    };

    const user = await prisma.user.create({ data });

    return NextResponse.json(
      { id: user.id, email: user.email },
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
