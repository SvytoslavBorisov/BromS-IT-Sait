export type LogLevel = "debug" | "info" | "warn" | "error";

export type LevelRank = Record<LogLevel, number>;
export const LEVEL_RANK: LevelRank = { debug: 10, info: 20, warn: 30, error: 40 };

export type AnyRecord = Record<string, any>;

export type BaseFields = {
  timestamp: string;
  level: LogLevel;
  service?: string;
  requestId?: string;
  module?: string;
};

export interface Logger {
  write(level: LogLevel, msg: string, meta?: unknown): void;
  debug(msg: AnyRecord): void;
  info(msg: AnyRecord): void;
  warn(msg: AnyRecord): void;
  error(msg: AnyRecord): void;
  logError(err: unknown, extra?: AnyRecord): void;
  flushAndClose(): Promise<void>;
  setLevel(level: LogLevel): void;
  child(ctx: Partial<Pick<BaseFields, "service" | "requestId" | "module">>): Logger;
}
