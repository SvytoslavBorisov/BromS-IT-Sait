import { randomUUID } from "crypto";
import type { Logger } from "./types";
import { noopLogger } from "./noopLogger";
import { isRestrictedFS } from "./runtime";
import { LOG_LEVEL } from "./env";

let _loggerSingleton: Logger | null = null;

/**
 * Ленивая выдача логгера.
 * В средах без fs — возвращает no-op логгер.
 * На сервере — динамически подключает ServerLogger.
 */
export function getLogger(serviceName = process.env.SERVICE_NAME): Logger {
  if (isRestrictedFS) return noopLogger;
  if (_loggerSingleton) return _loggerSingleton;

  // Динамический require, чтобы не тащить node-only код в edge/client bundle
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ServerLogger } = require("./serverLogger") as typeof import("./serverLogger");

  _loggerSingleton = new ServerLogger({ service: serviceName });
  _loggerSingleton.setLevel(LOG_LEVEL);
  return _loggerSingleton;
}

// Публичный делегирующий логгер (безопасен для импорта везде)
export const logger: Logger = {
  write: (level, msg, meta) => getLogger().write(level, msg, meta),
  debug: (obj) => getLogger().debug(obj),
  info: (obj) => getLogger().info(obj),
  warn: (obj) => getLogger().warn(obj),
  error: (obj) => getLogger().error(obj),
  logError: (err, extra) => getLogger().logError(err, extra),
  flushAndClose: () => getLogger().flushAndClose(),
  setLevel: (lvl) => getLogger().setLevel(lvl),
  child: (ctx) => getLogger().child(ctx),
};

// Утилиты
export function ensureRequestId(existing?: string | null): string {
  if (existing && typeof existing === "string" && existing.length >= 8) return existing;
  return randomUUID();
}

export async function shutdownLogger() {
  await getLogger().flushAndClose();
}

// Re-exports типов (если нужно)
export * from "./types";
