export async function sendTelegramMessage(chatIdRaw: unknown, text: string) {
  const token = process.env.TG_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");

  // chat_id должен быть ЧИСЛОМ (int64). Часто из Prisma приходит BigInt.
  const chatId =
    typeof chatIdRaw === "bigint"
      ? Number(chatIdRaw)
      : Number(String(chatIdRaw));

  if (!Number.isFinite(chatId)) {
    throw new Error(`Invalid chat_id: ${String(chatIdRaw)}`);
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // можно добавить parse_mode и disable_web_page_preview по вкусу
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  // Telegram ВСЕГДА отвечает JSON'ом
  let body: any;
  try {
    body = await res.json();
  } catch {
    const raw = await res.text();
    throw new Error(`Telegram response is not JSON: HTTP ${res.status} :: ${raw}`);
  }

  if (!body.ok) {
    // типичные описания:
    // 403 Forbidden: bot was blocked by the user
    // 403 Forbidden: bot can't initiate conversation with a user
    // 400 Bad Request: chat not found
    throw new Error(`Telegram API error ${body.error_code}: ${body.description}`);
  }

  return body; // ok:true, result: {...}
}