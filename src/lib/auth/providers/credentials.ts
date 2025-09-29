// src/lib/auth/providers/credentials.ts
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { verifyHPT } from "@/lib/captcha/hpt";

/** Универсальный getHeader: работает и с WHATWG Headers, и с Node IncomingHttpHeaders */
function getHeader(
  headers: Headers | Record<string, any> | undefined,
  name: string
): string | null {
  if (!headers) return null;

  // WHATWG Headers (web)
  if (typeof (headers as any).get === "function") {
    const v = (headers as Headers).get(name);
    return v == null ? null : v;
  }

  // Node IncomingHttpHeaders (next-auth authorize(req))
  const h = headers as Record<string, any>;
  const v = h[name] ?? h[name.toLowerCase()];
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "string") return v;
  return null;
}

/** Извлечение cookie по имени */
function readCookieFromAnyHeaders(
  headers: Headers | Record<string, any> | undefined,
  name: string
): string | null {
  const raw = getHeader(headers, "cookie") || "";
  if (!raw) return null;
  const found = raw.split(/;\s*/).find((c) => c.startsWith(name + "="));
  return found ? decodeURIComponent(found.split("=")[1]) : null;
}

/** Достаём ip/ua из любых заголовков */
function extractIpUaFromAnyHeaders(
  headers: Headers | Record<string, any> | undefined
): { ip: string; ua: string } {
  const ua = getHeader(headers, "user-agent") || "";
  const fwd = getHeader(headers, "x-forwarded-for") || "";
  const ip = fwd.split(",")[0]?.trim() || "";
  return { ip, ua };
}

export default function credentialsProvider() {
  return CredentialsProvider({
    name: "Email & Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      hpt: { label: "HPT", type: "text" }, // dev-фолбэк (не обязателен)
    },

    async authorize(credentials, req) {
      const t0 = Date.now();
      const authLog = logger.child({ module: "credentials.authorize" });

      const { ip, ua } = extractIpUaFromAnyHeaders(req?.headers as any);
      const hptCookie = readCookieFromAnyHeaders(req?.headers as any, "hpt");
      const hptBody = (credentials?.hpt as string | undefined) || "";
      const hpt = hptCookie || hptBody;

      // Проверка HPT на scope auth:login
      const humanOk = !!(hpt && verifyHPT(hpt, { ua, ip, requireScope: "auth:login" }));
      if (!humanOk) {
        authLog.warn({ event: "auth.login", outcome: "blocked", reason: "captcha_required", ip, ua });
        return null;
      }

      // Нормализация логина/пароля
      const email = (credentials?.email ?? "").toLowerCase().trim();
      const pass = credentials?.password ?? "";
      if (!email || !pass) return null;

      // Пользователь и проверка пароля
      const user = await prisma.user.findUnique({ where: { email }, include: { password: true } });
      if (!user?.password?.hash) {
        authLog.warn({
          event: "auth.login",
          outcome: "failure",
          reason: user ? "no_password_set" : "bad_credentials",
          login: email, ip, ua, latencyMs: Date.now() - t0
        });
        return null;
      }

      const valid = await bcrypt.compare(pass, user.password.hash);
      if (!valid) {
        authLog.warn({ event: "auth.login", outcome: "failure", reason: "bad_credentials", login: email, ip, ua, latencyMs: Date.now() - t0 });
        return null;
      }

      if (!user.emailVerified) {
        authLog.warn({ event: "auth.login", outcome: "failure", reason: "email_not_verified", login: email, ip, ua, latencyMs: Date.now() - t0 });
        return null;
      }

      authLog.info({ event: "auth.login", outcome: "success", login: email, ip, ua, latencyMs: Date.now() - t0 });
      return { id: user.id, email: user.email, name: user.name ?? undefined, image: user.image ?? undefined };
    },
  });
}
