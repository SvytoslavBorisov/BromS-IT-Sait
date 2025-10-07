import type { AnyRecord, LogLevel } from "./types";
import { LOG_TRUNCATE_LIMIT } from "./env";

// ANSI-цвета только для dev-консоли
export const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[37m",
  info: "\x1b[36m",
  warn: "\x1b[33m",
  error: "\x1b[31m",
};
export const RESET = "\x1b[0m";

export const dayStamp = (d = new Date()) => d.toISOString().slice(0, 10);

// Ключи чувствительных данных — в нижнем регистре
const SENSITIVE_KEYS = new Set<string>([
  "password",
  "pass",
  "pwd",
  "token",
  "access_token",
  "accesstoken",
  "refresh_token",
  "refreshtoken",
  "secret",
  "api_key",
  "apikey",
  "authorization",
  "cookie",
  "set-cookie",
  "session",
  "jwt",
  "bearer",
  "x-api-key",
  "csrf",
]);

function isPlainObject(v: any): v is AnyRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof Error);
}

function truncateString(s: string): string {
  if (s.length <= LOG_TRUNCATE_LIMIT) return s;
  return s.slice(0, LOG_TRUNCATE_LIMIT) + `…<truncated ${s.length - LOG_TRUNCATE_LIMIT} chars>`;
}

/**
 * Маскируем секреты до указанной глубины. Ключи сравниваются в lower-case.
 * Понимает Error/Date/Array, а также Headers/Map-подобные коллекции.
 */
export function maskSensitive(obj: any, depth = 0, maxDepth = 4): any {
  if (obj == null) return obj;
  if (depth > maxDepth) return obj;

  const t = typeof obj;
  if (t === "string") return truncateString(obj);
  if (t === "number" || t === "boolean" || t === "bigint") return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (obj instanceof Error) {
    const out: AnyRecord = {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
    if ("code" in obj) out.code = (obj as any).code;
    if ("errno" in obj) out.errno = (obj as any).errno;
    if ("syscall" in obj) out.syscall = (obj as any).syscall;
    if ("cause" in obj) out.cause = (obj as any).cause;
    return out;
  }
  if (Array.isArray(obj)) return obj.map((v) => maskSensitive(v, depth + 1, maxDepth));

  // WHATWG Headers
  if (typeof obj?.forEach === "function" && typeof obj?.get === "function" && typeof obj?.append === "function") {
    const out: AnyRecord = {};
    obj.forEach((v: any, k: string) => {
      const keyLc = String(k).toLowerCase();
      out[k] = SENSITIVE_KEYS.has(keyLc) ? "***" : maskSensitive(v, depth + 1, maxDepth);
    });
    return out;
  }

  // Map / Map-подобное
  if (typeof obj?.forEach === "function" && !Array.isArray(obj)) {
    const out: AnyRecord = {};
    obj.forEach((v: any, k: any) => {
      const keyLc = String(k).toLowerCase();
      out[String(k)] = SENSITIVE_KEYS.has(keyLc) ? "***" : maskSensitive(v, depth + 1, maxDepth);
    });
    return out;
  }

  if (isPlainObject(obj)) {
    const out: AnyRecord = {};
    for (const [k, v] of Object.entries(obj)) {
      const keyLc = k.toLowerCase();
      out[k] = SENSITIVE_KEYS.has(keyLc) ? "***" : maskSensitive(v, depth + 1, maxDepth);
    }
    return out;
  }

  return obj;
}

/**
 * Безопасный JSON.stringify:
 *  - bigint → string
 *  - Error → плоский объект
 *  - циклы → "[Circular]"
 *  - очень длинные строки → обрезаются
 */
export function safeStringify(input: any): string {
  const seen = new WeakSet();
  return JSON.stringify(
    input,
    (key, value) => {
      if (typeof value === "bigint") return value.toString();
      if (typeof value === "string") return truncateString(value);
      if (value instanceof Error) {
        const o: AnyRecord = {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
        if ("code" in value) o.code = (value as any).code;
        if ("errno" in value) o.errno = (value as any).errno;
        if ("syscall" in value) o.syscall = (value as any).syscall;
        if ("cause" in value) o.cause = (value as any).cause;
        return o;
      }
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      return value;
    },
    // компактно, одна строка на запись
    0
  );
}
