import type { Logger } from "./types";

const noopAsync = async () => {};

export const noopLogger: Logger = {
  write: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  logError: () => {},
  flushAndClose: noopAsync,
  setLevel: () => {},
  child: () => noopLogger,
};
