// src/lib/auth/register/validate.ts
import type { Sex } from "@prisma/client";

export function normalizeEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}

export function ensureEmailAndPassword(normEmail: string, password: unknown) {
  if (!normEmail || !password) {
    const e = new Error("Поля email и password обязательны");
    (e as any).status = 400;
    throw e;
  }
}

export function parseAgeOrNull(age: unknown): Date | null {
  if (age == null || age === "") return null;
  const d = new Date(String(age));
  if (isNaN(d.getTime())) {
    const e = new Error("Поле age должно быть корректной датой (например, 1999-12-31)");
    (e as any).status = 400;
    throw e;
  }
  return d;
}

export function coerceSexOrNull(sex: unknown): Sex | null {
  if (sex == null || sex === "") return null;
  const upper = String(sex).toUpperCase();
  if (upper !== "MALE" && upper !== "FEMALE") {
    const e = new Error("Поле sex должно быть 'MALE' или 'FEMALE'");
    (e as any).status = 400;
    throw e;
  }
  return upper as Sex;
}

export function validatePublicJwk(publicKey: any) {
  if (!publicKey || typeof publicKey !== "object") {
    const e = new Error("Отсутствует или некорректен publicKey (JWK)");
    (e as any).status = 400;
    throw e;
  }
  if (publicKey.kty !== "EC") {
    const e = new Error("JWK.kty должен быть 'EC'");
    (e as any).status = 400;
    throw e;
  }
  if (publicKey.crv !== "GOST-2012-256") {
    const e = new Error("JWK.crv должен быть 'GOST-2012-256'");
    (e as any).status = 400;
    throw e;
  }
  if (!publicKey.x || !publicKey.y) {
    const e = new Error("JWK должен содержать координаты x и y");
    (e as any).status = 400;
    throw e;
  }
  if (publicKey.d) {
    const e = new Error("Публичный JWK не должен содержать поле d");
    (e as any).status = 400;
    throw e;
  }
}
