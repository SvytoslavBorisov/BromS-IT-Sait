import { NextRequest } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegram/webapp";
import fs from "fs";
import path from "path";

export const runtime = "nodejs"; // нужен Node crypto

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { initData, profile } = body || {};
    const BOT_TOKEN = process.env.BOT_TOKEN || "";
    if (!verifyTelegramInitData(String(initData || ""), BOT_TOKEN)) {
      return new Response(JSON.stringify({ ok: false, error: "bad-initdata" }), { status: 401 });
    }

    // На реальном бекенде тут — запись в БД (user_id из initDataUnsafe.user.id)
    // Для примера — складываем в файл .json (эпhemeral в контейнерах, но ок для MVP)
    const uid = getUserIdFromInitData(initData);
    const dataDir = path.join(process.cwd(), ".runner_data");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, `profile_${uid || "anon"}.json`), JSON.stringify(profile || {}, null, 2));

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "bad-request" }), { status: 400 });
  }
}

function getUserIdFromInitData(initData: string): number | null {
  const p = new URLSearchParams(initData);
  const user = p.get("user");
  if (!user) return null;
  try { return JSON.parse(user)?.id ?? null; } catch { return null; }
}
