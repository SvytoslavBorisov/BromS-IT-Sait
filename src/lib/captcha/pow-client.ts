// src/lib/captcha/pow-client.ts
// Клиентский PoW под серверную формулу:
// digest = SHA-256( state_bytes || nonce_bytes )
// state — base64url (без padding), nonce — 8 байт (u64, BE).
// Возвращаем nonceHex и hashHex + актуальную difficulty.

type Action = "login" | "register" | "resend" | "forgot" | "reset";

export async function solvePow(params: {
  stateB64: string;
  action: Action;        // для логов/телеметрии (не влияет на хеш)
  difficulty: number;    // требуемые ведущие нулевые биты (индикативно)
  timeoutMs?: number;    // по умолчанию 8000
  yieldEvery?: number;   // по умолчанию 4096
  signal?: AbortSignal;  // опциональная отмена
}): Promise<{ nonceHex: string; nonce: string; hashHex: string; difficulty: number }> {
  const { stateB64, difficulty, signal } = params;
  const timeoutMs = params.timeoutMs ?? 8000;

  // нормализуем yieldEvery в степень двойки (>= 256)
  const _y = Math.max(256, params.yieldEvery ?? 4096);
  const yieldEvery = 1 << Math.floor(Math.log2(_y));

  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("WebCrypto not available");
  }

  const stateBytes = b64urlToBytes(stateB64);
  const deadline = Date.now() + timeoutMs;

  // Случайный старт nonce (u64)
  const seed = new Uint32Array(2);
  (crypto as Crypto).getRandomValues(seed);
  let hi = seed[0] >>> 0;
  let lo = seed[1] >>> 0;

  const nonceBytes = new Uint8Array(8);

  // Буфер: state || nonce(8)
  const concat = new Uint8Array(stateBytes.length + 8);
  concat.set(stateBytes, 0);

  let iter = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal?.aborted) throw new Error("pow_aborted");
    if (Date.now() > deadline) {
      throw new Error("pow_timeout");
    }

    if ((iter++ & (yieldEvery - 1)) === 0) {
      // даём шанc UI/рендеру
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve();
    }

    writeU64BE(nonceBytes, hi, lo);
    concat.set(nonceBytes, stateBytes.length);

    // eslint-disable-next-line no-await-in-loop
    const digestBuf = await crypto.subtle.digest("SHA-256", concat);
    const digest = new Uint8Array(digestBuf);

    const lz = leadingZeroBits(digest);
    if (lz >= difficulty) {
      const hashHex = toHex(digest);
      const nonceHex = toHex(nonceBytes);
      // Возвращаем однозначный формат + legacy-ключ "nonce" для совместимости
      return { nonceHex, nonce: nonceHex, hashHex, difficulty };
    }

    // ++nonce (u64)
    lo = (lo + 1) >>> 0;
    if (lo === 0) hi = (hi + 1) >>> 0;
  }
}

/* ===== helpers ===== */

function b64urlToBytes(s: string): Uint8Array {
  const padLen = (4 - (s.length % 4)) % 4;
  const pad = padLen ? "=".repeat(padLen) : "";
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
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
  for (let i = 0; i < bytes.length; i++) {
    s += (bytes[i] & 0xff).toString(16).padStart(2, "0");
  }
  return s;
}

/** Подсчёт ведущих нулевых бит во всём дайджесте */
function leadingZeroBits(bytes: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0) {
      count += 8;
      continue;
    }
    // первый ненулевой байт: считаем нули с MSB
    for (let k = 7; k >= 0; k--) {
      if (((b >> k) & 1) === 0) count++;
      else return count;
    }
  }
  return count; // все байты были 0
}
