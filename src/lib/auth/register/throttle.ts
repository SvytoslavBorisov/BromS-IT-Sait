// src/lib/auth/register/throttle.ts
import { createHash } from "crypto";

/** Ключ троттл-куки для email */
export function throttleKey(email: string) {
  return `rt_${createHash("sha256").update(email).digest("hex").slice(0, 16)}`;
}

/** Опции куки троттла на 60 сек */
export const throttleCookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60,
};
