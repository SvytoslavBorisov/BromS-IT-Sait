// src/lib/captcha/hpt.ts
import jwt from "jsonwebtoken";
import crypto from "crypto";

function sha(x: string) {
  return crypto.createHash("sha256").update(x).digest("base64url");
}

export function issueHPT({
  scope,
  ua,
  ip,
  ttlSec = 20 * 60,
}: {
  scope: string[];
  ua: string;
  ip?: string;
  ttlSec?: number;
}) {
  const uaHash = sha(ua || "ua:unknown");
  const ipHash = ip ? sha(ip) : ""; // пустая строка, если IP нет
  const payload = { sub: "human", scope, uaHash, ipHash };
  return jwt.sign(payload, process.env.HPT_SECRET!, { algorithm: "HS256", expiresIn: ttlSec });
}

export function verifyHPT(
  token: string,
  { ua, ip, requireScope }: { ua: string; ip?: string; requireScope: string }
) {
  try {
    const dec = jwt.verify(token, process.env.HPT_SECRET!) as any;
    // Жёстко проверяем срок и UA
    const wantUa = sha(ua || "ua:unknown");
    if (dec.uaHash !== wantUa) return false;

    // Мягко проверяем IP: если в токене ipHash пустой — не проверяем;
    // если у запроса IP не удалось извлечь — не проверяем;
    // если оба есть и различаются — отклоняем.
    const wantIp = ip ? sha(ip) : "";
    if (dec.ipHash && wantIp && dec.ipHash !== wantIp) return false;

    if (!Array.isArray(dec.scope) || !dec.scope.includes(requireScope)) return false;
    return true;
  } catch {
    return false;
  }
}
