// src/lib/logger.ts
import { createWriteStream, existsSync, mkdirSync } from "fs";
import path from "path";

// Настраиваем директорию и файл
const LOG_DIR  = process.env.LOG_DIR  || path.join(process.cwd(), "logs");
const LOG_FILE = process.env.LOG_FILE || "debug.log";
const LOG_PATH = path.join(LOG_DIR, LOG_FILE);

// Создаём папку, если её нет
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

// Поток для дозаписи
const stream = createWriteStream(LOG_PATH, {
  flags: "a",
  mode: 0o600, // rw-------
});

// Обработчик ошибок стрима
stream.on("error", (err) => {
  console.error("Logger stream error:", err);
});

/**
 * Записывает объект в лог в виде JSON-строки с новой строкой
 */
export function log(obj: Record<string, any>) {
  try {
    const line = JSON.stringify({
      ...obj,
      timestamp: new Date().toISOString(),
    });
    stream.write(line + "\n");
  } catch (e) {
    console.error("Failed to write log:", e);
  }
}
