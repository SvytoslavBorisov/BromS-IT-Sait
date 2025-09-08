// src/lib/telegram/webapp.ts
import crypto from "crypto";

/** Проверяет Telegram WebApp initData (hash) */
export function verifyTelegramInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash") || "";
  urlParams.delete("hash");

  const dataCheckArr: string[] = [];
  urlParams.forEach((value, key) => {
    dataCheckArr.push(`${key}=${value}`);
  });
  dataCheckArr.sort((a, b) => a.localeCompare(b));
  const dataCheckString = dataCheckArr.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return hmac === hash;
}

export function parseWebAppInitData(initData: string): any {
  const params = new URLSearchParams(initData);
  const obj: Record<string, any> = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  try {
    if (obj.user) obj.user = JSON.parse(obj.user);
    if (obj.chat) obj.chat = JSON.parse(obj.chat);
  } catch {}
  return obj;
}
