import { NextRequest } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegram/webapp";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ ok:false, error:"bad-body" }, { status:400 });

  const { initData, score } = body;
  const BOT_TOKEN = process.env.BOT_TOKEN || "";
  if (!verifyTelegramInitData(String(initData||""), BOT_TOKEN))
    return Response.json({ ok:false, error:"bad-initdata" }, { status:401 });

  const uid  = getUserId(initData);
  const name = getUsername(initData) || `id${uid}`;
  if (!uid) return Response.json({ ok:false, error:"no-user" }, { status:400 });

  const dir = path.join(process.cwd(), ".runner_data");
  const file = path.join(dir, "leaderboard.json");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });
  let arr: any[] = [];
  try { arr = JSON.parse(fs.readFileSync(file, "utf8") || "[]"); } catch {}

  // храним лучший результат пользователя
  const now = Date.now();
  const prev = arr.find(x => x.uid === uid);
  if (!prev || score > prev.score) {
    const entry = { uid, name, score, ts: now };
    arr = arr.filter(x => x.uid !== uid).concat(entry);
  }
  // топ-100
  arr.sort((a,b) => b.score - a.score);
  arr = arr.slice(0, 100);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));

  return Response.json({ ok:true });
}

function getUserId(initData: string): number | null {
  const p = new URLSearchParams(initData);
  try { return JSON.parse(p.get("user") || "{}")?.id ?? null; } catch { return null; }
}
function getUsername(initData: string): string | null {
  const p = new URLSearchParams(initData);
  try { return JSON.parse(p.get("user") || "{}")?.username ?? null; } catch { return null; }
}
