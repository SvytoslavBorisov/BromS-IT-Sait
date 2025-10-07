import path from "path";
import { LOG_BASE, LOG_DIR, LOG_STDOUT, MAX_BYTES, ROTATE_DAILY } from "./env";
import { dayStamp } from "./utils";

// Общий core-состояние для всех логгеров на сервере
type Core = {
  level: import("./types").LogLevel;
  stream: import("fs").WriteStream | null;
  currentDay: string;
  bytesWritten: number;
  warnedBackpressure: boolean;
};

export const core: Core = {
  level: (process.env.LOG_LEVEL?.toLowerCase() as any) || "info",
  stream: null,
  currentDay: dayStamp(),
  bytesWritten: 0,
  warnedBackpressure: false,
};

function getFs() {
  // Подключаем fs только по требованию (на сервере)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("fs") as typeof import("fs");
}

export function ensureStream(): void {
  if (core.stream) return;
  const fs = getFs();
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

  const filePath = path.join(LOG_DIR, `${LOG_BASE}-${core.currentDay}.log`);
  try {
    core.bytesWritten = fs.statSync(filePath).size;
  } catch {
    core.bytesWritten = 0;
  }
  core.stream = fs.createWriteStream(filePath, { flags: "a", mode: 0o600 });
  core.stream.on("error", (err: unknown) => {
    // Пишем в stderr как последнюю линию обороны
    try {
      // eslint-disable-next-line no-console
      console.error("Logger stream error:", err);
    } catch {}
  });
}

export async function rotateIfNeeded(): Promise<void> {
  const fs = getFs();
  let needRotate = false;

  // Ротация по дате
  if (ROTATE_DAILY) {
    const now = dayStamp();
    if (now !== core.currentDay) {
      core.currentDay = now;
      needRotate = true;
    }
  }

  // Ротация по размеру
  const overSize = core.bytesWritten >= MAX_BYTES;

  if (!needRotate && !overSize) return;

  // 1) закрыть текущий поток
  if (core.stream) {
    await new Promise<void>((res) => core.stream!.end(res));
    core.stream = null;
  }

  // 2) если по размеру — переименовать закрытый файл
  if (overSize) {
    try {
      const current = path.join(LOG_DIR, `${LOG_BASE}-${core.currentDay}.log`);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const rotated = path.join(LOG_DIR, `${LOG_BASE}-${core.currentDay}-${stamp}.log`);
      fs.renameSync(current, rotated);
    } catch {
      // ignore
    }
  }

  // 3) открыть свежий поток
  ensureStream();
  core.bytesWritten = 0;
  core.warnedBackpressure = false;
}

export function writeLine(line: string): void {
  // Пишем в stdout по флагу (часто нужно в контейнерах/облаке)
  if (LOG_STDOUT) {
    try {
      process.stdout.write(line);
    } catch {
      // ignore
    }
  }

  // Если файла нет — просто выходим (может быть вызвано из restricted сред)
  if (!core.stream) return;

  const ok = core.stream.write(line);
  core.bytesWritten += Buffer.byteLength(line, "utf8");

  if (!ok && !core.warnedBackpressure) {
    core.warnedBackpressure = true;
    try {
      // eslint-disable-next-line no-console
      console.warn("[logger] write buffer is full, waiting for drain…");
    } catch {}
    core.stream.once("drain", () => {
      core.warnedBackpressure = false;
    });
  }
}

export async function flushAndClose(): Promise<void> {
  if (!core.stream) return;
  await new Promise<void>((resolve) => core.stream!.end(resolve));
  core.stream = null;
}

export function setLevel(lvl: import("./types").LogLevel) {
  core.level = lvl;
}

export function getLevel(): import("./types").LogLevel {
  return core.level;
}
