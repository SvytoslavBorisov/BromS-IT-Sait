import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions }       from "@/lib/auth";
import fs                   from "fs";
import path                 from "path";

export async function GET() {
  // 1) Авторизация
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Чтение файла
  const logDir  = process.env.LOG_DIR  || path.join(process.cwd(), "logs");
  const logFile = process.env.LOG_FILE || "debug.log";
  const logPath = path.join(logDir, logFile);

  let content: string;
  try {
    content = await fs.promises.readFile(logPath, "utf8");
  } catch (e: any) {
    if (e.code === "ENOENT") {
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json({ error: "Cannot read log file" }, { status: 500 });
  }

  // 3) Парсинг JSON-строк
  const lines = content
    .split("\n")
    .filter((l) => l.trim().length > 0);

  const logs = lines.map((l) => {
    try {
      return JSON.parse(l);
    } catch {
      return null;
    }
  }).filter((x): x is Record<string, any> => x !== null);

  // 4) Возвращаем JSON-массив
  return NextResponse.json(logs);
}