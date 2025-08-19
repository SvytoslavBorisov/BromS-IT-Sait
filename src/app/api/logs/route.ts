// src/app/api/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // поправь путь, если у тебя другой
import { promises as fs } from "fs";
import path from "path";
import { glob } from "glob";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

type Level = "debug" | "info" | "warn" | "error";
type LogEntry = {
  timestamp: string;
  level: Level;
  event?: string;
  message?: string;
  userId?: string;
  requestId?: string;
  module?: string;
  [k: string]: any;
};

// Настройки — совместимы и с “старым” логом, и с новым ротационным
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), "logs");
const LOG_BASE =
  (process.env.LOG_FILE && process.env.LOG_FILE.replace(/\.log$/i, "")) || "app"; // напр. "app" → app-YYYY-MM-DD.log

/** Прочитать последние N записей из нескольких последних лог‑файлов. */
async function readRecentLogs(limit: number): Promise<LogEntry[]> {
  // берём до 5 самых свежих файлов (если ротация по датам)
  // подходят имена вида `${LOG_BASE}-*.log` И/ИЛИ одинарный файл без даты
  const pattern = `${LOG_DIR}/${LOG_BASE}-*.log`;
  let files = (await glob(pattern)).sort(); // по возрастанию
  if (files.length === 0) {
    // fallback: одиночный файл без даты (например, debug.log)
    const single = path.join(LOG_DIR, `${LOG_BASE}.log`);
    files = [single];
  }

  const take = files.slice(-5).reverse(); // самые новые первыми
  const out: LogEntry[] = [];

  for (const file of take) {
    let content = "";
    try {
      content = await fs.readFile(file, "utf8");
    } catch {
      continue; // пропускаем недоступные
    }

    // идём снизу вверх, чтобы быстрее набрать лимит
    const lines = content.trim().split(/\r?\n/).reverse();
    for (const line of lines) {
      try {
        const obj = JSON.parse(line) as LogEntry;
        // минимальная валидация
        if (obj && obj.timestamp && obj.level) {
          out.push(obj);
          if (out.length >= limit) return out;
        }
      } catch {
        // пропустим битые строки
      }
    }
  }

  return out;
}

export async function GET(req: NextRequest) {
  // 1) Авторизация
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Достаём параметры
  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get("scope") || "me") as "me" | "all";
  const level = (searchParams.get("level") || "") as Level | "";
  const q = (searchParams.get("q") || "").toLowerCase();
  const limit = Math.max(1, Math.min(2000, Number(searchParams.get("limit") || 300)));
  const explicitUserId = searchParams.get("userId") || "";

  // userId для "Мои" берём из сессии
  const myUserId = (session.user as any)?.id as string | undefined;
  const userIdFilter = scope === "me" ? (explicitUserId || myUserId || "") : explicitUserId;

  // 2) Чтение и первичная выборка
  const raw = await readRecentLogs(limit * 3); // возьмём запас, чтобы отфильтровать

  // 3) Фильтры
  const filtered = raw.filter((r) => {
    if (level && r.level !== level) return false;
    if (userIdFilter && r.userId !== userIdFilter) return false;
    if (q) {
      // быстрый полнотекстовый фильтр по JSON
      const hay = JSON.stringify(r).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // 4) Сортировка по убыванию времени и ограничение
  filtered.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));

  return NextResponse.json(filtered.slice(0, limit));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { level = "info", ...data } = body;

    logger[level as "debug" | "info" | "warn" | "error"]({
      userId: (session.user as any)?.id,
      ...data,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}