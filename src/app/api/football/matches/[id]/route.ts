import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// .env.local:
// MATCHES_DIR=D:\football-data\matches\byId
const FALLBACK_DIR = path.join(process.cwd(), ".data", "matches", "byId");
const MATCHES_DIR = process.env.PLAYERS_INDEX_PATH || FALLBACK_DIR;

function pickFirst(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function sanitizeId(id: string): string {
  return id.replace(/[^0-9A-Za-z_-]/g, "").slice(0, 64);
}

async function resolveFile(dir: string, base: string): Promise<string | null> {
  const file = path.join(dir, `${base}.json`);
  try {
    const st = await fsp.stat(file);
    return st.isFile() ? file : null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id?: string | string[] }> }
) {
  const p = await ctx.params;
  const raw = pickFirst(p.id).trim();
  if (!raw) return NextResponse.json({ error: "no id" }, { status: 400 });

  const safe = sanitizeId(raw);
  if (!safe) return NextResponse.json({ error: "bad id" }, { status: 400 });

  let file = await resolveFile(MATCHES_DIR, safe);
  if (!file) {
    const asNum = Number(safe);
    if (Number.isFinite(asNum)) file = await resolveFile(MATCHES_DIR, String(asNum));
  }
  if (!file) return NextResponse.json({ error: "not found", id: raw }, { status: 404 });

  try {
    const st = await fsp.stat(file);
    if (st.size > 30 * 1024 * 1024) {
      return NextResponse.json(
        { error: "match file too large", id: raw, size: st.size },
        { status: 413 }
      );
    }
  } catch {
    return NextResponse.json({ error: "not found", id: raw }, { status: 404 });
  }

  try {
    const stream = fs.createReadStream(file, { encoding: "utf8" });
    // @ts-ignore — Node stream ок для NextResponse
    return new NextResponse(stream as any, {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ error: "read failed", id: raw }, { status: 500 });
  }
}
