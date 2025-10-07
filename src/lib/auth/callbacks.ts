import type { NextAuthOptions } from "next-auth";
import { logger } from "@/lib/logger";

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/check-email",
  "/auth/verify",
  "/auth/resend",
]);

function isLocal(url: string, baseUrl: string) {
  try {
    const u = new URL(url, baseUrl);
    const b = new URL(baseUrl);
    return u.origin === b.origin;
  } catch {
    return false;
  }
}

const callbacks: NextAuthOptions["callbacks"] = {
  async redirect({ url, baseUrl }) {
    // 1) Безопасные локальные абсолютные URL
    if (isLocal(url, baseUrl)) {
      try {
        const u = new URL(url, baseUrl);
        // Не блокируем whitelisted публичные страницы
        if (PUBLIC_PATHS.has(u.pathname)) return u.toString();
        // Разрешаем любые локальные приватные пути
        return u.toString();
      } catch {
        /* no-op */
      }
    }

    // 2) Относительные пути ("/something")
    if (url?.startsWith("/")) {
      // Публичные whitelisted — пропускаем
      if (PUBLIC_PATHS.has(url)) return `${baseUrl}${url}`;
      // Иначе — тоже можно, это локальный путь
      return `${baseUrl}${url}`;
    }

    // 3) Внешние URL запрещаем (защита от open redirect)
    // 4) По умолчанию — на профиль
    return `${baseUrl}/profile`;
  },

  async session({ session, token }) {
    session.user = { ...session.user, id: token.sub! };
    return session;
  },

  async jwt({ token, user, trigger }) {
    if (trigger === "signIn" && user) {
      const authLog = logger.child({ module: "auth/jwt" });
      authLog.debug({
        event: "auth.jwt_issued",
        outcome: "success",
        userId: (user as any).id,
      });
    }
    return token;
  },
};

export default callbacks;
