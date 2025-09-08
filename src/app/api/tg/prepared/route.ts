/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * ENV:
 *  - BOT_TOKEN                   (обязательно)
 *  - TG_API_BASE (опционально)   например, локальный Bot API: https://botapi.myhost
 */
const BOT_TOKEN = process.env.BOT_TOKEN!;
const TG_API_BASE = (process.env.TG_API_BASE || "https://api.telegram.org").replace(/\/+$/,"");

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required in env");
}

/** ==== Утиль: безопасный парс и валидация initData (WebApp) ==== */
/**
 * Сборка data_check_string как в доке:
 *   - распарсить Telegram.WebApp.initData (URLSearchParams)
 *   - исключить "hash"
 *   - отсортировать по ключу
 *   - склеить "key=value" через '\n'
 * Хэш проверяется по секретному ключу:
 *   secret_key = HMAC_SHA256(BOT_TOKEN, "WebAppData")
 *   check = HMAC_SHA256(data_check_string, secret_key)
 */
function validateAndParseInitData(initDataRaw: string) {
  const params = new URLSearchParams(initDataRaw);
  const theirHash = params.get("hash");
  if (!theirHash) throw new Error("initData hash missing");

  // Сформировать data_check_string
  const pairs: string[] = [];
  const keys: string[] = [];
  params.forEach((_v, k) => { if (k !== "hash") keys.push(k); });
  keys.sort();
  for (const k of keys) {
    const v = params.get(k) ?? "";
    pairs.push(`${k}=${v}`);
  }
  const dataCheckString = pairs.join("\n");

  // Секрет и подпись
  const secretKey = crypto.createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest(); // Buffer

  const check = crypto.createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (check !== theirHash) throw new Error("initData hash mismatch");

  // Доп.проверка на протухание (auth_date)
  const authDate = Number(params.get("auth_date") || "0");
  if (!Number.isFinite(authDate) || authDate <= 0) {
    throw new Error("initData auth_date invalid");
  }
  // 1 час по умолчанию
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 3600 * 6) { // можешь ослабить/усилить окно
    throw new Error("initData expired");
  }

  // user (JSON) обязателен — нужен user.id
  const userJson = params.get("user");
  if (!userJson) throw new Error("initData missing user");
  let user: any;
  try { user = JSON.parse(userJson); }
  catch { throw new Error("initData.user is not a valid JSON"); }
  if (typeof user?.id !== "number") throw new Error("initData.user.id missing");

  return { user, params };
}

/** ==== Вспомогательное: вызов Bot API ==== */
async function telegram(method: string, payload: Record<string, any>) {
  const url = `${TG_API_BASE}/bot${BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    // при желании можно добавить timeout через AbortController
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.ok) {
    const desc = json?.description || res.statusText;
    const code = json?.error_code || res.status;
    throw new Error(`BotAPI ${method} failed: ${code} ${desc}`);
  }
  return json.result;
}

/** ==== Основной обработчик ==== */
export async function POST(req: NextRequest) {
  try {
    // 1) Тело запроса (текст, url, опционально кнопка/peer_types)
    const body = await req.json().catch(() => ({}));
    const text: string = (body.text ?? "").toString();
    const url: string = (body.url ?? "").toString();

    if (!text || !url) {
      return NextResponse.json(
        { ok: false, error: "Both 'text' and 'url' are required" },
        { status: 400 }
      );
    }

    // Кастомизации (необязательные)
    const buttonText: string = (body.button_text ?? "Открыть мини-игру").toString();
    // Ограничим куда можно шарить: users | groups | channels
    // По умолчанию разрешим все 3, можно сузить с клиента.
    const peerTypes: string[] = Array.isArray(body.peer_types) && body.peer_types.length
      ? body.peer_types
      : ["users", "groups", "channels"];

    // 2) initData — либо в заголовке, либо в теле (raw строка из Telegram.WebApp.initData)
    const initDataRaw =
      req.headers.get("x-telegram-init-data") ||
      (typeof body.initData === "string" ? body.initData : "");
    if (!initDataRaw) {
      return NextResponse.json(
        { ok: false, error: "initData is required (header X-Telegram-Init-Data or body.initData)" },
        { status: 401 }
      );
    }

    // 3) Валидация и извлечение user_id
    const { user } = validateAndParseInitData(initDataRaw);
    const userId: number = user.id;

    // 4) Формируем InlineQueryResult для savePreparedInlineMessage
    // Самый простой — article с текстом + URL-кнопкой
    const inlineResult = {
      type: "article",
      id: "score-" + crypto.randomUUID(),          // уникальный id результата
      title: "Поделиться результатом",
      input_message_content: {
        message_text: `${text}\n${url}`,
        parse_mode: "HTML",                        // можно оставить без форматирования
        disable_web_page_preview: false
      },
      reply_markup: {
        inline_keyboard: [[ { text: buttonText, url } ]]
      },
      description: text.slice(0, 120)
    };

    // 5) Вызываем Bot API: savePreparedInlineMessage
    // Аргументы: user_id, result (InlineQueryResult), optional peer_types
    const prepared = await telegram("savePreparedInlineMessage", {
      user_id: userId,
      result: inlineResult,
      peer_types: peerTypes, // например: ["users","groups","channels"]
    });

    // prepared => { id: string, ... } — вернём только ID
    return NextResponse.json({ ok: true, id: prepared.id });
  } catch (e: any) {
    const msg = e?.message || "internal error";
    // Можно логировать подробнее
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
