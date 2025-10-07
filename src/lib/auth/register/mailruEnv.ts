// src/lib/auth/register/mailruEnv.ts
import { logger } from "@/lib/logger";

/**
 * Безопасная проверка SMTP Mail.ru.
 * Не логируем пароль и его производные.
 */
export function assertMailruEnvAndLog() {
  const host = "smtp.mail.ru";
  const user = (process.env.MAILRU_USER || "").trim();
  const pass = (process.env.MAILRU_PASS || "").trim();
  const port = Number(process.env.MAILRU_PORT || 465);

  if (!user) throw new Error("MAILRU_USER is not set");
  if (!pass) throw new Error("MAILRU_PASS is not set");
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("MAILRU_PORT is not a valid number");
  }

  logger.info({
    message: "smtp.mailru.env.ok",
    smtp: { host, port, hasUser: !!user, hasPass: !!pass },
  });

  return { host, user, port };
}
