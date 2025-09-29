// src/lib/captcha/state.ts
import crypto from "crypto";

export type CaptchaAction = "register" | "login" | "resend" | "forgot" | "reset";

export const ACTION_SCOPES: Record<CaptchaAction, string[]> = {
  register: ["auth:register"],
  login: ["auth:login"],
  resend: ["auth:resend"],
  forgot: ["auth:forgot"],
  reset: ["auth:reset"],
};

const ALLOWED: CaptchaAction[] = ["register", "login", "resend", "forgot", "reset"];
export function isAllowedAction(a: unknown): a is CaptchaAction {
  return typeof a === "string" && (ALLOWED as string[]).includes(a);
}

/* ================= base64url helpers ================= */

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

/* ================= hashing/secret ================= */

export function hash(x: string) {
  return crypto.createHash("sha256").update(x).digest("base64url");
}

function getCaptchaSecret(): Buffer {
  const key = process.env.CAPTCHA_STATE_SECRET;
  if (typeof key !== "string" || key.length < 16) {
    // Дадим понятное сообщение, чтобы не ловить неясные crypto-ошибки
    throw new Error("CAPTCHA_STATE_SECRET is not set or too short");
  }
  return Buffer.from(key, "utf8");
}

/* ================= difficulty policy ================= */

/**
 * Серверная политика сложности PoW.
 * ВАЖНО: клиентское значение difficulty игнорируется при проверке.
 *
 * Базовые уровни:
 *  - register: 22
 *  - login:    20
 *  - resend:   20
 *  - forgot:   20
 *  - reset:    20
 *
 * Лёгкая эвристика анти-бот:
 *  - «подозрительный» UA → +1..2
 *  - пустой/подозрительный IP → +1
 * Ограничено диапазоном [16..28] для разумного UX.
 */
export function getDifficultyFor(
  action: CaptchaAction,
  ctx?: { ua?: string; ip?: string }
): number {
  const base: Record<CaptchaAction, number> = {
    register: 22,
    login: 20,
    resend: 20,
    forgot: 20,
    reset: 20,
  };

  let diff = base[action] ?? 20;

  const ua = (ctx?.ua || "").toLowerCase();
  const ip = (ctx?.ip || "").trim();

  // Очень простая, но быстрая эвристика;
  // при желании можно усложнить и учитывать частоту событий через Redis.
  const badUaHints = [
    "headless", "phantom", "puppeteer", "selenium",
    "curl", "wget", "python-requests", "go-http-client",
  ];
  if (!ua || badUaHints.some((h) => ua.includes(h))) diff += 2;

  // Пустой/локальный/подозрительный IP → слегка поднимем
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("0.")) diff += 1;

  // Жёсткие рамки
  if (diff < 16) diff = 16;
  if (diff > 28) diff = 28;

  return diff;
}

/* ================= signed state ================= */

export type SignedState = {
  action: CaptchaAction;
  ts: number;
  uaHash: string;
  ipHash: string;
  seed: string;      // base64url
  mac: string;       // base64url(HMAC)
  rawPayload: string;
  encoded: string;   // base64url(payload|mac)
};

/**
 * Подписываем state: action|ts|uaHash|ipHash|seed|mac  (всё в utf8),
 * затем кодируем всю строку base64url без padding.
 */
export function signState(params: { action: CaptchaAction; ua: string; ip?: string; ttlSec?: number }): string {
  const ts = Math.floor(Date.now() / 1000);
  const uaSafe = params.ua || "ua:unknown";
  const ipSafe = params.ip ?? "";
  const uaHash = hash(uaSafe);
  const ipHash = hash(ipSafe);
  const seed = b64url(crypto.randomBytes(16));

  const payload = `${params.action}|${ts}|${uaHash}|${ipHash}|${seed}`;

  // Храним mac в виде base64url строки, но считаем и сравниваем в байтах
  const macBytes = crypto.createHmac("sha256", getCaptchaSecret()).update(payload).digest();
  const mac = b64url(macBytes);

  return b64url(Buffer.from(`${payload}|${mac}`, "utf8"));
}

/**
 * Верифицируем state. Сравнение подписи выполняется по СЫРЫМ байтам HMAC,
 * чтобы исключить расхождения из-за кодеков строк.
 */
export function verifyAndParseState(
  stateB64: string,
  {
    action,
    ua,
    ip,
    maxAgeSec = 120, // подсказка: на dev можно поднять до 300 (делаешь это в verify/route.ts)
  }: { action: CaptchaAction; ua: string; ip?: string; maxAgeSec?: number }
): { ok: true; state: SignedState } | { ok: false } {
  try {
    const raw = fromB64url(stateB64).toString("utf8");
    const parts = raw.split("|");
    if (parts.length !== 6) return { ok: false };

    const [a, tsStr, uaHash, ipHash, seed, macB64url] = parts;
    const ts = parseInt(tsStr, 10);
    if (!Number.isFinite(ts)) return { ok: false };

    const now = Math.floor(Date.now() / 1000);
    if (a !== action || now - ts > maxAgeSec) return { ok: false };

    const uaSafe = ua || "ua:unknown";
    const ipSafe = ip ?? "";
    const wantUa = hash(uaSafe);
    const wantIp = hash(ipSafe);
    if (uaHash !== wantUa || ipHash !== wantIp) return { ok: false };

    const payload = `${a}|${ts}|${uaHash}|${ipHash}|${seed}`;
    const wantMacBytes = crypto.createHmac("sha256", getCaptchaSecret()).update(payload).digest();
    const macBytes = fromB64url(macB64url);

    // Сравниваем именно байты одинаковой длины; при расхождении длины вернём false
    if (macBytes.length !== wantMacBytes.length) return { ok: false };
    if (!crypto.timingSafeEqual(macBytes, wantMacBytes)) return { ok: false };

    return {
      ok: true,
      state: {
        action: a as CaptchaAction,
        ts,
        uaHash,
        ipHash,
        seed,
        mac: macB64url,
        rawPayload: payload,
        encoded: stateB64,
      },
    };
  } catch {
    return { ok: false };
  }
}
