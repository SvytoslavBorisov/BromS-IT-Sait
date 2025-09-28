import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// .env.local:
// PLAYERS_BYID_DIR=D:\football-data\players\byId
const FALLBACK_DIR = path.join(process.cwd(), ".data", "players", "byId");
const BYID_DIR = process.env.PLAYERS_BYID_DIR || FALLBACK_DIR;

// —–– утилиты –––
function pickFirst(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

// ограничим id: только цифры/буквы/подчёркивание/дефис (и короче 64 символов)
function sanitizeId(id: string): string {
  const cleaned = id.replace(/[^0-9A-Za-z_-]/g, "").slice(0, 64);
  return cleaned;
}

async function resolveFile(dir: string, base: string): Promise<string | null> {
  const file = path.join(dir, `${base}.json`);
  try {
    const st = await fsp.stat(file);
    if (st.isFile()) return file;
    return null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id?: string | string[] }> } // 👈 params как Promise
) {
  // 👇 обязательно await
  const p = await ctx.params;
  const raw = pickFirst(p.id).trim();
  console.log(BYID_DIR)
  if (!raw) {
    return NextResponse.json({ error: "no id" }, { status: 400 });
  }

  // приводим id к безопасному виду (без ..\ и т.п.)
  const safe = sanitizeId(raw);
  if (!safe) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }

  // основной файл по строковому id
  let file = await resolveFile(BYID_DIR, safe);

  // если не нашли и id числовой — пробуем числовую форму
  if (!file) {
    const asNum = Number(safe);
    if (Number.isFinite(asNum)) {
      file = await resolveFile(BYID_DIR, String(asNum));
    }
  }

  if (!file) {
    return NextResponse.json({ error: "not found", id: raw }, { status: 404 });
  }

  // защита от слишком больших файлов
  try {
    const st = await fsp.stat(file);
    if (st.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "player file too large", id: raw, size: st.size },
        { status: 413 }
      );
    }
  } catch (e: any) {
    // EISDIR/ENOENT и прочее → 404
    return NextResponse.json({ error: "not found", id: raw }, { status: 404 });
  }

  // читаем и отдаём как is, без двойного JSON.stringify
  try {
    const stream = fs.createReadStream(file, { encoding: "utf8" });
    // @ts-ignore — NextResponse может принять ReadableStream (Node)
    return new NextResponse(stream as any, {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "read failed", id: raw }, { status: 500 });
  }
}
