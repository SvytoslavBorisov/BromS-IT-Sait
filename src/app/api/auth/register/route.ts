// src/app/api/auth/register/route.tsx
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

/**
 * GET /api/auth/register
 * Просто для проверки: возвращает подсказку, как правильно использовать эндпоинт.
 */
export async function GET() {
  return NextResponse.json(
    { message: "Чтобы зарегистрировать пользователя, сделайте POST с JSON { email, password }" },
    { status: 200 }
  );
}

/**
 * POST /api/auth/register
 * Ожидает { email, password }, проверяет на существование, хеширует пароль, создаёт запись.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Поля email и password обязательны" },
        { status: 400 }
      );
    }

    // Проверяем, нет ли уже такого пользователя
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    // Хешируем пароль
    const passwordHash = await hash(password, 10);

    // Создаём нового пользователя
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

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
