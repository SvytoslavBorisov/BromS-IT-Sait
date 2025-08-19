// src/lib/logger.ts
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import util from "util";

/* ===== Конфиг через env (разумные дефолты) ===== */
const LOG_DIR  = process.env.LOG_DIR  || path.join(process.cwd(), "logs");
const LOG_BASE = (process.env.LOG_FILE && process.env.LOG_FILE.replace(/\.log$/i,"")) || "app"; // без .log
const LOG_LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel; // debug|info|warn|error
const ROTATE_DAILY = (process.env.LOG_ROTATE_DAILY || "true") === "true";
const MAX_BYTES = parseInt(process.env.LOG_MAX_BYTES || "", 10) || 10 * 1024 * 1024; // 10MB

/* ===== Типы ===== */
export type LogLevel = "debug" | "info" | "warn" | "error";
type LevelRank = Record<LogLevel, number>;
const LEVEL_RANK: LevelRank = { debug: 10, info: 20, warn: 30, error: 40 };

type BaseFields = {
  timestamp: string;
  level: LogLevel;
  service?: string;
  requestId?: string;
  module?: string;
};

type AuthLoginEvent = {
  event: "auth.login";
  userId?: string;             // если известен (успешный логин или найден в БД)
  login?: string;              // введённый логин/емейл (без пароля)
  ip?: string;
  ua?: string;                 // user-agent
  method: "password" | "oauth" | "magic-link" | "sso";
  outcome: "success" | "failure";
  reason?: "bad_credentials" | "locked" | "2fa_required" | "2fa_failed" | "internal_error";
  requestId?: string;
  sessionId?: string;          // выданная сессия/токен (идентификатор, не сам токен)
  latencyMs?: number;
};

type AnyRecord = Record<string, any>;

/* ===== Утилиты ===== */

/** ISO‑дата (только день) для ротации */
function dayStamp(d = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Маскировка чувствительных полей (поверхностно и слегка рекурсивно для простых объектов) */
const SENSITIVE_KEYS = new Set([
  "password","pass","pwd","token","accessToken","refreshToken","secret","apiKey","authorization","cookie","set-cookie"
]);
function maskSensitive(obj: any, depth = 0): any {
  if (obj == null) return obj;
  if (depth > 2) return obj; // ограничим глубину чтобы не тратить CPU
  if (typeof obj === "string") return obj;
  if (typeof obj === "number" || typeof obj === "boolean" || typeof obj === "bigint") return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Buffer.isBuffer(obj)) return `<Buffer len=${obj.length}>`;
  if (Array.isArray(obj)) return obj.map(v => maskSensitive(v, depth + 1));

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
      ...("code" in obj ? { code: (obj as any).code } : {}),
    };
  }

  if (typeof obj === "object") {
    const out: AnyRecord = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(k)) {
        out[k] = "***";
      } else {
        out[k] = maskSensitive(v, depth + 1);
      }
    }
    return out;
  }
  return obj;
}

/** Безопасный JSON.stringify: bigint→string, циклы игнорим, Error обрабатываем */
function safeStringify(input: any): string {
  const seen = new WeakSet();
  return JSON.stringify(
    input,
    (key, value) => {
      if (typeof value === "bigint") return value.toString();
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
          ...("code" in value ? { code: (value as any).code } : {}),
        };
      }
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      return value;
    }
  );
}

/** Цветной вывод в dev без внешних пакетов */
const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[37m", // gray
  info:  "\x1b[36m", // cyan
  warn:  "\x1b[33m", // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

/* ===== Подготовка директории ===== */
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

/* ===== Класс Logger ===== */
class Logger {
  private level: LogLevel;
  private ctx: Partial<Pick<BaseFields, "service" | "requestId" | "module">>;
  private stream: import("fs").WriteStream;
  private currentDay: string;
  private bytesWritten = 0;

  constructor(opts?: { level?: LogLevel; service?: string; module?: string }) {
    this.level = opts?.level || LOG_LEVEL;
    this.ctx = {};
    if (opts?.service) this.ctx.service = opts.service;
    if (opts?.module)  this.ctx.module  = opts.module;

    this.currentDay = dayStamp();
    this.stream = this.openStream();

    this.stream.on("error", (err) => {
      // последний рубеж — только консоль
      console.error("Logger stream error:", err);
    });
  }

  /** Создаём/открываем текущий файл логов */
  private openStream() {
    const fileName = `${LOG_BASE}-${this.currentDay}.log`;
    const p = path.join(LOG_DIR, fileName);

    try {
      const s = statSync(p);
      this.bytesWritten = s.size;
    } catch {
      this.bytesWritten = 0;
    }

    return createWriteStream(p, { flags: "a", mode: 0o600 });
  }

  /** Проверяем и делаем ротацию (по дню/размеру) */
  private rotateIfNeeded() {
    let needRotate = false;

    if (ROTATE_DAILY) {
      const nowDay = dayStamp();
      if (nowDay !== this.currentDay) {
        this.currentDay = nowDay;
        needRotate = true;
      }
    }
    if (this.bytesWritten >= MAX_BYTES) {
      // Перекладываем текущий файл с суффиксом времени
      const current = path.join(LOG_DIR, `${LOG_BASE}-${this.currentDay}.log`);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const rotated = path.join(LOG_DIR, `${LOG_BASE}-${this.currentDay}-${stamp}.log`);
      try { renameSync(current, rotated); } catch { /* ignore */ }
      needRotate = true;
    }

    if (needRotate) {
      try { this.stream.close(); } catch { /* ignore */ }
      this.stream = this.openStream();
    }
  }

  /** Изменить уровень на лету */
  setLevel(level: LogLevel) {
    this.level = level;
  }

  /** Создать дочерний логгер с добавленным контекстом */
  child(ctx: Partial<Pick<BaseFields, "service" | "requestId" | "module">>) {
    const child = new Logger({ level: this.level });
    child.ctx = { ...this.ctx, ...ctx };
    // переиспользуем тот же файл/стрим
    child.stream = this.stream;
    child.currentDay = this.currentDay;
    child.bytesWritten = this.bytesWritten;
    return child;
  }

  /* ---- Основной метод записи ---- */
  private write(level: LogLevel, data: AnyRecord) {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.level]) return;

    const base: BaseFields = {
      timestamp: new Date().toISOString(),
      level,
      ...this.ctx,
    };

    const record = maskSensitive({ ...base, ...data });
    const line = safeStringify(record) + "\n";

    // Ротация до записи
    this.rotateIfNeeded();

    // Пишем
    const ok = this.stream.write(line);
    this.bytesWritten += Buffer.byteLength(line, "utf8");

    // Если backpressure — подождём drain, чтобы не захламлять буфер
    if (!ok) {
      this.stream.once("drain", () => { /* no-op: просто сбросили давление */ });
    }

    // Дублируем в консоль при dev
    if (process.env.NODE_ENV !== "production") {
      const color = COLORS[level] || "";
      const reset = RESET;
      // Короткая «красивая» строка + деталь в инспекте
      // Не печатаем второй раз огромный JSON: покажем ключевые поля и объект
      const { timestamp, level: lv, ...rest } = record;
      const head = `${color}${timestamp} [${lv.toUpperCase()}]${reset}` +
                   (record.module ? ` ${record.module}` : "") +
                   (record.requestId ? ` req=${record.requestId}` : "");
      // Для краткости печатаем как util.inspect (одноуровневый)
      console.log(head, util.inspect(rest, { depth: 2, breakLength: 120, maxArrayLength: 50 }));
    }
  }

  /* ---- Публичные методы ---- */
  debug(obj: AnyRecord) { this.write("debug", obj); }
  info(obj: AnyRecord)  { this.write("info",  obj); }
  warn(obj: AnyRecord)  { this.write("warn",  obj); }
  error(obj: AnyRecord) { this.write("error", obj); }

  /** Спец-хелпер для ошибок */
  logError(err: unknown, extra: AnyRecord = {}) {
    if (err instanceof Error) {
      this.error({ message: err.message, stack: err.stack, name: err.name, ...extra });
    } else {
      this.error({ message: "Non-Error thrown", value: err, ...extra });
    }
  }

  /** Аккуратно закрыть лог (например, в обработчике SIGTERM) */
  async flushAndClose(): Promise<void> {
    await new Promise<void>((resolve) => this.stream.end(resolve));
  }
}

/* ===== Экспорт: базовый логгер и удобные утилиты ===== */

export const logger = new Logger({ level: LOG_LEVEL, service: process.env.SERVICE_NAME });

/** Быстрый доступ к уровням (коротко) */
export const log = {
  debug: (obj: AnyRecord) => logger.debug(obj),
  info:  (obj: AnyRecord) => logger.info(obj),
  warn:  (obj: AnyRecord) => logger.warn(obj),
  error: (obj: AnyRecord) => logger.error(obj),
  errorEx: (err: unknown, extra?: AnyRecord) => logger.logError(err, extra),
};

/** Генерация/прокидывание requestId — используйте где нужно */
export function ensureRequestId(existing?: string | null): string {
  if (existing && typeof existing === "string" && existing.length >= 8) return existing;
  return randomUUID();
}

/** Грейсфул завершение: вызвать при выходе сервиса */
export async function shutdownLogger() {
  try {
    await logger.flushAndClose();
  } catch { /* ignore */ }
}
