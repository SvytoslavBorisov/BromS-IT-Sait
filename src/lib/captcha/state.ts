// src/lib/captcha/state.ts
import crypto from "crypto";

export type CaptchaAction = "login" | "register" | "resend" | "forgot" | "reset";

export const ACTION_SCOPES: Record<CaptchaAction, string[]> = {
  login:    ["auth:login"],
  register: ["auth:register"],
  resend:   ["auth:resend"],
  forgot:   ["auth:forgot"],
  reset:    ["auth:reset"],
};

export function isAllowedAction(a: any): a is CaptchaAction {
  return a === "login" || a === "register" || a === "resend" || a === "forgot" || a === "reset";
}

type Ctx = { ua?: string; ip?: string | null; env?: string | undefined };

/**
 * ЕДИНЫЙ источник сложности. Возвращает количество требуемых нулевых бит.
 * Стратегия: «ощущается быстро» (~0.3–0.8s на типовом железе).
 * - Мобильные: -2 бита
 * - Регистрация/забытый пароль: -1 бит
 * - Dev: не выше 18–19
 */
export function getDifficultyFor(action: CaptchaAction, ctx: Ctx): number {
  const ua = ctx.ua || "";
  const env = (ctx.env || process.env.NODE_ENV || "production").toLowerCase();

  const isMobile = /Android|iPhone|Mobile/i.test(ua);
  const isDesktop = /Windows NT|Mac OS X|X11|Linux x86_64/i.test(ua);

  // базовые значения
  let need =
    action === "login"   ? 19 :
    action === "register"? 18 :
    action === "resend"  ? 17 :
    action === "forgot"  ? 17 :
    action === "reset"   ? 18 : 18;

  if (isMobile) need -= 2;
  else if (!isDesktop) need -= 1;

  // минимальные/максимальные рамки
  need = Math.max(14, Math.min(22, need));

  // на dev не задираем слишком высоко
  if (env !== "production") need = Math.min(need, 18);

  return need;
}

/* --------------------- Подписанный state --------------------- */

type SignedStatePayload = {
  a: CaptchaAction;   // action
  t: number;          // timestamp (sec)
  u: string;          // ua hash (sha256 hex)
  i?: string;         // ip (обфусцированная/урезанная версия) — опционально
  n: number;          // need: требуемые нулевые биты
  x: number;          // ttlSec
};

const ALG = "sha256";

function hmac(key: Buffer, msg: Buffer): Buffer {
  return crypto.createHmac(ALG, key).update(msg).digest();
}

function toB64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 2 ? "==" : s.length % 4 === 3 ? "=" : "";
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function sha256hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function key(): Buffer {
  const k = process.env.CAPTCHA_STATE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!k) throw new Error("CAPTCHA_STATE_SECRET/NEXTAUTH_SECRET not set");
  return Buffer.from(k, "utf8");
}

export function splitSignedState(state: string): { bodyB64: string; sigB64: string } {
  const dot = state.indexOf(".");
  if (dot <= 0) throw new Error("bad_state_format");
  return { bodyB64: state.slice(0, dot), sigB64: state.slice(dot + 1) };
}

export function signState(input: {
  action: CaptchaAction;
  ua: string;
  ip?: string | null;
  need: number;
  ttlSec?: number;
}): { state: string; stateBody: string; ttlSec: number } {
  const ttlSec = Math.max(30, Math.min(300, input.ttlSec ?? 120));
  const payload: SignedStatePayload = {
    a: input.action,
    t: Math.floor(Date.now() / 1000),
    u: sha256hex(input.ua || ""),
    i: undefined,
    n: Math.max(1, Math.min(28, input.need | 0)),
    x: ttlSec,
  };

  const body = Buffer.from(JSON.stringify(payload), "utf8");
  const sig = hmac(key(), body);

  const bodyB64 = toB64url(body);
  const sigB64 = toB64url(sig);
  const state = `${bodyB64}.${sigB64}`;
  return { state, stateBody: bodyB64, ttlSec };
}

export function verifyAndParseState(
  state: string,
  opts: { action: CaptchaAction; ua: string; ip?: string | null; maxAgeSec?: number }
):
  | { ok: true; need: number }
  | { ok: false }
{
  if (!state || typeof state !== "string" || !state.includes(".")) return { ok: false };
  const [bodyB64, sigB64] = state.split(".");
  const body = fromB64url(bodyB64);
  const sig = fromB64url(sigB64);
  const want = hmac(key(), body);
  if (!crypto.timingSafeEqual(sig, want)) return { ok: false };

  let parsed: SignedStatePayload;
  try {
    parsed = JSON.parse(body.toString("utf8"));
  } catch {
    return { ok: false };
  }

  if (parsed.a !== opts.action) return { ok: false };

  // строгая привязка к UA
  if (!parsed.u || parsed.u !== sha256hex(opts.ua || "")) return { ok: false };

  const now = Math.floor(Date.now() / 1000);
  const age = now - parsed.t;
  const maxAge = Math.max(10, Math.min(parsed.x || 120, opts.maxAgeSec ?? 180));
  if (age < 0 || age > maxAge) return { ok: false };

  const need = Math.max(1, Math.min(28, parsed.n | 0));
  return { ok: true, need };
}
