import crypto from "crypto";

export function verifyInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash") || "";
  params.delete("hash");

  const data = Array.from(params.entries())
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hmac = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return hmac === hash;
}

export function parseInitData(initData: string): any {
  const params = new URLSearchParams(initData);
  const obj: Record<string, any> = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  try {
    if (obj.user) obj.user = JSON.parse(obj.user as string);
    if (obj.chat) obj.chat = JSON.parse(obj.chat as string);
  } catch {}
  return obj;
}
