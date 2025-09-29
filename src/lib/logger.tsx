// src/lib/logger.ts
// ВАЖНО: никакого fs на верхнем уровне — только ленивое создание потока на сервере.
import path from "path";
import { randomUUID } from "crypto";
import util from "util";

export type LogLevel = "debug" | "info" | "warn" | "error";
type LevelRank = Record<LogLevel, number>;
const LEVEL_RANK: LevelRank = { debug: 10, info: 20, warn: 30, error: 40 };

type AnyRecord = Record<string, any>;

type BaseFields = {
  timestamp: string;
  level: LogLevel;
  service?: string;
  requestId?: string;
  module?: string;
};

// ── env/настройки (без побочек) ────────────────────────────────────────────────
const LOG_DIR  = process.env.LOG_DIR  || path.join(process.cwd(), "logs");
const LOG_BASE = (process.env.LOG_FILE && process.env.LOG_FILE.replace(/\.log$/i,"")) || "app";
const LOG_LEVEL = (process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel;
const ROTATE_DAILY = (process.env.LOG_ROTATE_DAILY || "true") === "true";
const MAX_BYTES = parseInt(process.env.LOG_MAX_BYTES || "", 10) || 10 * 1024 * 1024;

// ── утилиты без fs ─────────────────────────────────────────────────────────────
const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[37m", info: "\x1b[36m", warn: "\x1b[33m", error: "\x1b[31m",
};
const RESET = "\x1b[0m";
const dayStamp = (d = new Date()) => d.toISOString().slice(0, 10);

const SENSITIVE_KEYS = new Set([
  "password","pass","pwd","token","accessToken","refreshToken","secret","apiKey","authorization","cookie","set-cookie"
]);

function maskSensitive(obj: any, depth = 0): any {
  if (obj == null || depth > 2) return obj;
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean" || typeof obj === "bigint") return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(v => maskSensitive(v, depth + 1));
  if (obj instanceof Error) {
    return { name: obj.name, message: obj.message, stack: obj.stack, ...( "code" in obj ? { code: (obj as any).code } : {} ) };
  }
  if (typeof obj === "object") {
    const out: AnyRecord = {};
    for (const [k, v] of Object.entries(obj)) out[k] = SENSITIVE_KEYS.has(k) ? "***" : maskSensitive(v, depth + 1);
    return out;
  }
  return obj;
}

function safeStringify(input: any): string {
  const seen = new WeakSet();
  return JSON.stringify(input, (key, value) => {
    if (typeof value === "bigint") return value.toString();
    if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack, ...( "code" in value ? { code: (value as any).code } : {} ) };
    if (typeof value === "object" && value !== null) { if (seen.has(value)) return "[Circular]"; seen.add(value); }
    return value;
  });
}

// ── детектор фаз, где НЕЛЬЗЯ трогать fs ───────────────────────────────────────
const isClient = typeof window !== "undefined";
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  !!(process as any).env?.__NEXT_PRIVATE_BUILD_WORKER; // внутренний флаг build-воркера

// ── интерфейс логгера ─────────────────────────────────────────────────────────
export interface Logger {
  write(level: LogLevel, msg: string, meta?: unknown): void;
  debug(msg: AnyRecord, meta?: unknown): void;
  info(msg: AnyRecord, meta?: unknown): void;
  warn(msg: AnyRecord, meta?: unknown): void;
  error(msg: AnyRecord, meta?: unknown): void;
  logError(err: unknown, extra?: AnyRecord): void;
  flushAndClose(): Promise<void>;
  setLevel(level: LogLevel): void;
  child(ctx: Partial<Pick<BaseFields,"service"|"requestId"|"module">>): Logger;
}

// ── no-op реализация для клиента/билда ────────────────────────────────────────
const noop = async () => {};
const noopLogger: Logger = {
  write: () => {},
  debug: () => {}, info: () => {}, warn: () => {}, error: () => {},
  logError: () => {}, flushAndClose: noop, setLevel: () => {},
  child: () => noopLogger,
};

// ── серверная реализация (создаётся лениво) ───────────────────────────────────
class ServerLogger implements Logger {
  private level: LogLevel;
  private ctx: Partial<Pick<BaseFields,"service"|"requestId"|"module">> = {};
  private stream: import("fs").WriteStream | null = null;
  private currentDay = dayStamp();
  private bytesWritten = 0;

  constructor(opts?: { level?: LogLevel; service?: string; module?: string }) {
    this.level = opts?.level || LOG_LEVEL;
    if (opts?.service) this.ctx.service = opts.service;
    if (opts?.module)  this.ctx.module  = opts.module;
  }

  private ensureStream() {
    if (this.stream) return;
    // Подключаем fs ТОЛЬКО здесь, когда мы уже уверены что не билд и не клиент
    const { createWriteStream, existsSync, mkdirSync, renameSync, statSync } = require("fs") as typeof import("fs");
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

    const filePath = path.join(LOG_DIR, `${LOG_BASE}-${this.currentDay}.log`);
    try { const st = statSync(filePath); this.bytesWritten = st.size; } catch { this.bytesWritten = 0; }
    this.stream = createWriteStream(filePath, { flags: "a", mode: 0o600 });
    this.stream.on("error", (err: unknown) => { console.error("Logger stream error:", err); });
  }

  private rotateIfNeeded() {
    const { renameSync } = require("fs") as typeof import("fs");
    let needRotate = false;
    if (ROTATE_DAILY) {
      const now = dayStamp();
      if (now !== this.currentDay) { this.currentDay = now; needRotate = true; }
    }
    if (this.bytesWritten >= MAX_BYTES) {
      const current = path.join(LOG_DIR, `${LOG_BASE}-${this.currentDay}.log`);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const rotated = path.join(LOG_DIR, `${LOG_BASE}-${this.currentDay}-${stamp}.log`);
      try { renameSync(current, rotated); } catch { /* ignore */ }
      needRotate = true;
    }
    if (needRotate) {
      try { this.stream?.close(); } catch { /* ignore */ }
      this.stream = null;
      this.ensureStream();
    }
  }

  setLevel(level: LogLevel) { this.level = level; }

  child(ctx: Partial<Pick<BaseFields,"service"|"requestId"|"module">>): Logger {
    const c = new ServerLogger({ level: this.level });
    c.ctx = { ...this.ctx, ...ctx };
    (c as any).stream = this.stream;
    (c as any).currentDay = this.currentDay;
    (c as any).bytesWritten = this.bytesWritten;
    return c;
  }

  write(level: LogLevel, msg: string, meta?: unknown): void {
    this._write(level, { message: msg, ...(meta ? { meta } : {}) });
  }

  debug(obj: AnyRecord) { this._write("debug", obj); }
  info(obj: AnyRecord)  { this._write("info",  obj); }
  warn(obj: AnyRecord)  { this._write("warn",  obj); }
  error(obj: AnyRecord) { this._write("error", obj); }

  private _write(level: LogLevel, data: AnyRecord) {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.level]) return;

    const base: BaseFields = { timestamp: new Date().toISOString(), level, ...this.ctx };
    const record = maskSensitive({ ...base, ...data });
    const line = safeStringify(record) + "\n";

    // В dev — всегда в консоль
    if (process.env.NODE_ENV !== "production") {
      const color = COLORS[level] || "";
      const { timestamp, level: lv, ...rest } = record as any;
      const head = `${color}${timestamp} [${String(lv).toUpperCase()}]${RESET}` +
        (record.module ? ` ${record.module}` : "") +
        (record.requestId ? ` req=${record.requestId}` : "");
      console.log(head, util.inspect(rest, { depth: 2, breakLength: 120, maxArrayLength: 50 }));
    }

    // В build-phase/клиенте — НИЧЕГО fs, просто выходим
    if (isClient || isBuildPhase) return;

    // Серверный путь: лениво открываем стрим и пишем
    this.ensureStream();
    this.rotateIfNeeded();
    const ok = this.stream!.write(line);
    this.bytesWritten += Buffer.byteLength(line, "utf8");
    if (!ok) this.stream!.once("drain", () => {});
  }

  logError(err: unknown, extra: AnyRecord = {}) {
    if (err instanceof Error) this.error({ message: err.message, stack: err.stack, name: err.name, ...extra });
    else this.error({ message: "Non-Error thrown", value: err, ...extra });
  }

  async flushAndClose(): Promise<void> {
    if (!this.stream) return;
    await new Promise<void>((resolve) => this.stream!.end(resolve));
  }
}

// ── ленивый синглтон ──────────────────────────────────────────────────────────
let _loggerSingleton: Logger | null = null;
export function getLogger(name = process.env.SERVICE_NAME): Logger {
  if (isClient || isBuildPhase) return noopLogger;
  if (_loggerSingleton) return _loggerSingleton;
  _loggerSingleton = new ServerLogger({ level: LOG_LEVEL, service: name });
  return _loggerSingleton;
}

// ── Публичный logger с поддержкой .child(...) ─────────────────────────────────
// NB: это полноценный Logger, делегирующий к серверному синглтону.
// На клиенте и в build-phase — no-op, так что импорт безопасен везде.
export const logger: Logger = {
  write: (level, msg, meta) => getLogger().write(level, msg, meta),
  debug: (obj) => getLogger().debug(obj),
  info:  (obj) => getLogger().info(obj),
  warn:  (obj) => getLogger().warn(obj),
  error: (obj) => getLogger().error(obj),
  logError: (err, extra) => getLogger().logError(err, extra),
  flushAndClose: () => getLogger().flushAndClose(),
  setLevel: (lvl) => getLogger().setLevel(lvl),
  child: (ctx) => getLogger().child(ctx),
};

// ── Утилиты ───────────────────────────────────────────────────────────────────
export function ensureRequestId(existing?: string | null): string {
  if (existing && typeof existing === "string" && existing.length >= 8) return existing;
  return randomUUID();
}

export async function shutdownLogger() {
  await getLogger().flushAndClose();
}

// (Для обратной совместимости можно оставить алиас, но лучше импортировать { logger }):
// export const log = logger;
