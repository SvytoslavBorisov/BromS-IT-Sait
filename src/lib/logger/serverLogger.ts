import path from "path";
import { COLORS, RESET, maskSensitive, safeStringify } from "./utils";
import { core, ensureStream, rotateIfNeeded, writeLine, getLevel, setLevel, flushAndClose } from "./core";
import type { AnyRecord, BaseFields, Logger, LogLevel } from "./types";
import { LOG_BASE, LOG_DIR } from "./env";

/**
 * Серверный Logger.
 * Внутри использует общий core (один поток, единые счётчики).
 * child(...) лишь добавляет контекст, не плодит новые потоки.
 */
export class ServerLogger implements Logger {
  private ctx: Partial<Pick<BaseFields, "service" | "requestId" | "module">>;

  constructor(ctx?: Partial<Pick<BaseFields, "service" | "requestId" | "module">>) {
    this.ctx = ctx || {};
  }

  setLevel(level: LogLevel) {
    setLevel(level);
  }

  child(ctx: Partial<Pick<BaseFields, "service" | "requestId" | "module">>): Logger {
    return new ServerLogger({ ...this.ctx, ...ctx });
  }

  write(level: LogLevel, msg: string, meta?: unknown): void {
    this._write(level, { message: msg, ...(meta ? { meta } : {}) });
  }
  debug(obj: AnyRecord) {
    this._write("debug", obj);
  }
  info(obj: AnyRecord) {
    this._write("info", obj);
  }
  warn(obj: AnyRecord) {
    this._write("warn", obj);
  }
  error(obj: AnyRecord) {
    this._write("error", obj);
  }

  private async _prepare(): Promise<void> {
    // ensure file stream and rotate if needed
    ensureStream();
    await rotateIfNeeded();
  }

  private _devConsole(record: AnyRecord) {
    if (process.env.NODE_ENV === "production") return;
    const level = (record.level || "info") as LogLevel;
    const color = COLORS[level] || "";
    const timestamp = record.timestamp;
    const head =
      `${color}${timestamp} [${String(level).toUpperCase()}]${RESET}` +
      (record.module ? ` ${record.module}` : "") +
      (record.requestId ? ` req=${record.requestId}` : "");
    // util.inspect подключаем динамически только здесь
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const util = require("util") as typeof import("util");
    const { timestamp: _t, level: _l, ...rest } = record;
    // eslint-disable-next-line no-console
    console.log(head, util.inspect(rest, { depth: 2, breakLength: 120, maxArrayLength: 50 }));
  }

  private _write(level: LogLevel, data: AnyRecord) {
    // фильтрация по уровню
    const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
    if (LEVEL_RANK[level] < LEVEL_RANK[getLevel()]) return;

    const base: BaseFields = {
      timestamp: new Date().toISOString(),
      level,
      ...this.ctx,
    };

    const record = maskSensitive({ ...base, ...data }, 0, 5);
    const line = safeStringify(record) + "\n";

    this._devConsole(record);

    // Серверный путь: подготовить поток и ротацию (fs подключается лениво внутри)
    this._prepare()
      .then(() => writeLine(line))
      .catch(() => {
        // При любой ошибке — финальный fallback в stderr
        try {
          // eslint-disable-next-line no-console
          console.error(
            `[logger] failed writing to file ${path.join(LOG_DIR, LOG_BASE)}*.log; payload: ${line.slice(0, 2000)}`
          );
        } catch {}
      });
  }

  logError(err: unknown, extra: AnyRecord = {}) {
    if (err instanceof Error) {
      const { name, message, stack } = err;
      const payload: AnyRecord = { name, message, stack, ...extra };
      if ("code" in err) payload.code = (err as any).code;
      if ("errno" in err) payload.errno = (err as any).errno;
      if ("syscall" in err) payload.syscall = (err as any).syscall;
      if ("cause" in err) payload.cause = (err as any).cause;
      this.error(payload);
    } else {
      this.error({ message: "Non-Error thrown", value: err, ...extra });
    }
  }

  async flushAndClose(): Promise<void> {
    await flushAndClose();
  }
}
