import path from "path";
import type { LogLevel } from "./types";

// Конфиг без побочек (никакого fs)
export const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), "logs");
export const LOG_BASE =
  (process.env.LOG_FILE && process.env.LOG_FILE.replace(/\.log$/i, "")) || "app";
export const LOG_LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel;
export const ROTATE_DAILY = (process.env.LOG_ROTATE_DAILY || "true") === "true";
export const MAX_BYTES =
  parseInt(process.env.LOG_MAX_BYTES || "", 10) || 10 * 1024 * 1024;

// Доп. флаги
// Если true — печатаем JSON-линию ещё и в stdout (удобно для контейнеров)
export const LOG_STDOUT = (process.env.LOG_STDOUT || "false") === "true";

// Ограничение длины строк в safeStringify (чтобы не раздувать логи)
export const LOG_TRUNCATE_LIMIT =
  parseInt(process.env.LOG_TRUNCATE_LIMIT || "", 10) || 20000;
