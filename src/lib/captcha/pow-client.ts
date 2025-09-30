// src/lib/captcha/pow-client.ts
// Клиентский PoW под формулу сервера:
// digest = SHA-256( state_body_bytes || nonce_bytes )
// ВНИМАНИЕ: сюда передаём ТОЛЬКО stateBody (чистый base64url, без точки/подписи).
// nonce — 8 байт (u64, BE).

type Action = "login" | "register" | "resend" | "forgot" | "reset";

export async function solvePow(params: {
  stateB64: string;     // ЧИСТЫЙ base64url body (без padding)
  action: Action;       // для логов/телеметрии
  difficulty: number;   // целевые нулевые биты
  timeoutMs?: number;   // общий дедлайн
  yieldEvery?: number;  // итераций до yield
  signal?: AbortSignal; // отмена
}): Promise<{ nonceHex: string; nonce: string; hashHex: string; difficulty: number }> {
  const { stateB64, signal } = params;

  // Защита: если кто-то по ошибке передал "body.sig" — отрежем подпись
  const cleanStateB64 = stateB64.includes(".") ? stateB64.split(".")[0] : stateB64;

  let required = Math.max(1, Math.min(255, params.difficulty | 0));
  const timeoutMs = params.timeoutMs ?? 12_000;
  const _y = Math.max(256, params.yieldEvery ?? 8192);
  const yieldEvery = 1 << Math.floor(Math.log2(_y));

  if (!isSecureContext || typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("WebCrypto not available: requires HTTPS secure context");
  }

  const stateBytes = b64urlToBytes(cleanStateB64);
  const concat = new Uint8Array(stateBytes.length + 8);
  concat.set(stateBytes, 0);

  const deadline = performance.now() + timeoutMs;
  const start = performance.now();

  const seed = new Uint32Array(2);
  crypto.getRandomValues(seed);
  let hi = seed[0] >>> 0;
  let lo = seed[1] >>> 0;

  const nonceBytes = new Uint8Array(8);
  let iter = 0;
  let yieldedOnce = false;
  let adaptedDown = false;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal?.aborted) throw new Error("pow_aborted");

    if (performance.now() > deadline) {
      if (!adaptedDown && required > 12) {
        adaptedDown = true;
        required -= 1;
        const extra = Math.max(1500, (timeoutMs * 0.2) | 0);
        (deadline as number) += extra;
        continue;
      }
      throw new Error("pow_timeout");
    }

    if ((iter++ & (yieldEvery - 1)) === 0) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, yieldedOnce ? 0 : 1));
      yieldedOnce = true;
    }

    writeU64BE(nonceBytes, hi, lo);
    concat.set(nonceBytes, stateBytes.length);

    // eslint-disable-next-line no-await-in-loop
    const digestBuf = await crypto.subtle.digest("SHA-256", concat);
    const digest = new Uint8Array(digestBuf);

    const lz = leadingZeroBits(digest);
    if (lz >= required) {
      const hashHex = toHex(digest);
      const nonceHex = toHex(nonceBytes);
      return { nonceHex, nonce: nonceHex, hashHex, difficulty: required };
    }

    lo = (lo + 1) >>> 0;
    if (lo === 0) hi = (hi + 1) >>> 0;

    const elapsed = performance.now() - start;
    if (!adaptedDown && elapsed > timeoutMs * 0.67 && required > 22) {
      adaptedDown = true;
      required -= 1;
    }
  }
}

/* ===== helpers ===== */

function b64urlToBytes(s: string): Uint8Array {
  // Жёсткая валидация: только URL-safe алфавит
  if (!/^[A-Za-z0-9\-_]+$/.test(s)) {
    throw new Error("b64url_invalid");
  }
  const padLen = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + (padLen ? "=".repeat(padLen) : "");
  let bin = "";
  try {
    bin = atob(b64);
  } catch {
    throw new Error("b64_atob_failed");
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
  return out;
}

function writeU64BE(out: Uint8Array, hi: number, lo: number) {
  out[0] = (hi >>> 24) & 0xff;
  out[1] = (hi >>> 16) & 0xff;
  out[2] = (hi >>> 8) & 0xff;
  out[3] = (hi >>> 0) & 0xff;
  out[4] = (lo >>> 24) & 0xff;
  out[5] = (lo >>> 16) & 0xff;
  out[6] = (lo >>> 8) & 0xff;
  out[7] = (lo >>> 0) & 0xff;
}

function toHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += (bytes[i] & 0xff).toString(16).padStart(2, "0");
  return s;
}

function leadingZeroBits(bytes: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0) { count += 8; continue; }
    for (let k = 7; k >= 0; k--) {
      if (((b >> k) & 1) === 0) count++;
      else return count;
    }
  }
  return count;
}
