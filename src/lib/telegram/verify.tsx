import crypto from "crypto";

export function verifyTelegramLogin(
  payload: Record<string, any>,
  botToken: string,
  opts: { maxAgeSec?: number } = {}
): { ok: true } | { ok: false; reason: string } {
  if (!botToken) return { ok: false, reason: "No bot token" };
  const { hash, ...rest } = payload || {};
  if (!hash) return { ok: false, reason: "No hash" };

  // data_check_string: sorted key=value by '\n' (без hash)
  const dataCheckString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  // защищённое сравнение
  const okSig = timingSafeEqualHex(hash, computed);
  if (!okSig) return { ok: false, reason: "Signature mismatch" };

  const nowSec = Math.floor(Date.now() / 1000);
  const authSec = Number(rest.auth_date);
  if (!Number.isFinite(authSec)) return { ok: false, reason: "Bad auth_date" };

  const maxAge = opts.maxAgeSec ?? 300;
  if (Math.abs(nowSec - authSec) > maxAge) return { ok: false, reason: "Expired" };

  return { ok: true };
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
