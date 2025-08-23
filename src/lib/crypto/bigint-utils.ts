// src/lib/crypto/bigint-utils.ts
export const enc = new TextEncoder();

export function bytesConcat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

export function u16be(x: number): Uint8Array {
  const b = new Uint8Array(2); b[0] = (x >>> 8) & 0xff; b[1] = x & 0xff; return b;
}
export function u32be(x: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = (x >>> 24) & 0xff; b[1] = (x >>> 16) & 0xff; b[2] = (x >>> 8) & 0xff; b[3] = x & 0xff;
  return b;
}

export function bigintToBytes(x: bigint, len?: number): Uint8Array {
  if (x < 0n) throw new Error("bigintToBytes: negative");
  const hex = x.toString(16).padStart(len ? len * 2 : 0, "0");
  const h = len ? hex.slice(-len * 2) : (hex.length % 2 ? "0" + hex : hex);
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToBigint(b: Uint8Array): bigint {
  let x = 0n;
  for (const v of b) x = (x << 8n) + BigInt(v);
  return x;
}

export function bitLen(x: bigint): number { return x === 0n ? 0 : x.toString(2).length; }

export function mod(a: bigint, m: bigint): bigint {
  const r = a % m; return r >= 0n ? r : r + m;
}

export function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  base = mod(base, m);
  let res = 1n;
  while (exp > 0n) {
    if (exp & 1n) res = mod(res * base, m);
    base = mod(base * base, m);
    exp >>= 1n;
  }
  return res;
}

export function modInv(a: bigint, m: bigint): bigint {
  // m — простое => a^(m-2) mod m
  return modPow(mod(a, m), m - 2n, m);
}
