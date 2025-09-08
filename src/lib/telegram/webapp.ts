// src/lib/telegram/webapp.ts
import crypto from "crypto";

export function verifyWebAppInitData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash") || "";
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
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
