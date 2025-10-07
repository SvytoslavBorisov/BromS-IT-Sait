import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ПУБЛИЧНЫЕ маршруты, доступные без сессии
const PUBLIC_PATHS = new Set<string>([
  "/",                      // если нужна публичная главная
  "/auth/login",
  "/auth/register",
  "/auth/check-email",      // ← ВАЖНО: страница «проверьте почту»
  "/auth/verify",           // подтверждение e-mail по токену
  "/auth/resend",           // повторная отправка письма
]);

// Префиксы путей, которые всегда публичны
const PUBLIC_PREFIXES = [
  "/api/auth/register",     // ваш POST регистрации
  "/api/auth/verify",
  "/api/auth/resend-verification",
  "/_next",                 // статика Next
  "/favicon.ico",
  "/images",
  "/public",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Публичные пути пропускаем без проверки токена
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Проверяем сессию (JWT). Настройте секрет через NEXTAUTH_SECRET
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = new URL("/auth/login", req.url);
    // Сохраним, куда хотели попасть
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Ограничим зону действия middleware (исключим ассеты и статику)
export const config = {
  matcher: [
    // всё, кроме ассетов/_next иконок и т.п.
    "/((?!_next|favicon.ico|images|public|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map|txt)).*)",
  ],
};
