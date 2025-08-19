export type Level = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: Level;
  event?: string;
  message?: string;
  userId?: string;
  requestId?: string;
  module?: string;
  [k: string]: any;
}