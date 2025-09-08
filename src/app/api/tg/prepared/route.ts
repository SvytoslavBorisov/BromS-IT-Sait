/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// === ВАЖНО: принудительно Node.js рантайм и отключаем кеш ===
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ENV:
//  BOT_TOKEN=xxxxx
//  TG_API_BASE=https://api.telegram.org (опционально)
//  DEBUG=1  (чтобы сервер писал расширенные логи)
//  SKIP_INITDATA_CHECK=1 (временно отключить проверку initData для диагностики)
const BOT_TOKEN = process.env.BOT_TOKEN!;
const TG_API_BASE = (process.env.TG_API_BASE || "https://api.telegram.org").replace(/\/+$/,"");
const DEBUG = process.env.DEBUG === "1";
const SKIP_CHECK = process.env.SKIP_INITDATA_CHECK === "1";

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required");

function log(...a: any[]) { if (DEBUG) console.log("[/api/tg/prepared]", ...a); }
function err(...a: any[]) { console.error("[/api/tg/prepared]", ...a); }

// Проверка/парсинг initData как в доке TG
function validateAndParseInitData(initDataRaw: string) {
  const params = new URLSearchParams(initDataRaw);
  const theirHash = params.get("hash");
  if (!theirHash) throw new Error("initData hash missing");

  const pairs: string[] = [];
  const keys: string[] = [];
  params.forEach((_v, k) => { if (k !== "hash") keys.push(k); });
  keys.sort();
  for (const k of keys) pairs.push(`${k}=${params.get(k) ?? ""}`);
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const check = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (check !== theirHash) throw new Error("initData hash mismatch");

  const userJson = params.get("user");
  if (!userJson) throw new Error("initData missing user");
  const user = JSON.parse(userJson);
  if (typeof user?.id !== "number") throw new Error("initData.user.id missing");

  const authDate = Number(params.get("auth_date") || "0");
  const now = Math.floor(Date.now()/1000);
  if (!Number.isFinite(authDate) || now - authDate > 3600 * 6) {
    throw new Error("initData expired");
  }

  return { user, params };
}

async function telegram(method: string, payload: Record<string, any>) {
  const url = `${TG_API_BASE}/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    throw new Error(`BotAPI ${method} failed: ${json?.error_code || res.status} ${json?.description || res.statusText}`);
  }
  return json.result;
}

// Простой health-пинг GET, чтобы проверить доступность роута/логов
export async function GET() {
  log("GET health ok");
  return NextResponse.json({ ok: true, service: "prepared", runtime: "nodejs" });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text: string = (body.text ?? "").toString();
    const url: string = (body.url ?? "").toString();
    const buttonText: string = (body.button_text ?? "Открыть").toString();
    const peerTypes: string[] = Array.isArray(body.peer_types) && body.peer_types.length
      ? body.peer_types : ["users","groups","channels"];

    if (!text || !url) {
      log("bad body", { text, url });
      return NextResponse.json({ ok:false, error:"Both 'text' and 'url' are required" }, { status: 400 });
    }

    // initData можно передавать заголовком или полем
    const initDataRaw =
      req.headers.get("x-telegram-init-data") ||
      (typeof body.initData === "string" ? body.initData : "");

    if (!initDataRaw && !SKIP_CHECK) {
      log("no initData");
      return NextResponse.json({ ok:false, error:"initData required" }, { status: 401 });
    }

    let userId: number | null = null;
    if (!SKIP_CHECK) {
      const { user } = validateAndParseInitData(initDataRaw!);
      userId = user.id;
      log("validated", { userId, peerTypes });
    } else {
      // Внимание: только для диагностики!
      userId = Number(body.test_user_id || 0) || undefined as any;
      log("SKIP_INITDATA_CHECK active, userId:", userId);
    }

    const inlineResult = {
      type: "article",
      id: "score-" + crypto.randomUUID(),
      title: "Поделиться результатом",
      input_message_content: {
        message_text: `${text}\n${url}`,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      },
      reply_markup: { inline_keyboard: [[{ text: buttonText, url }]] },
      description: text.slice(0, 120),
    };

    const prepared = await telegram("savePreparedInlineMessage", {
      user_id: userId,
      result: inlineResult,
      peer_types: peerTypes,
    });

    log("prepared ok", { id: prepared.id });
    return NextResponse.json({ ok: true, id: prepared.id });

  } catch (e: any) {
    err("POST error:", e?.message || e);
    return NextResponse.json({ ok:false, error: e?.message || "internal error" }, { status: 500 });
  }
}
