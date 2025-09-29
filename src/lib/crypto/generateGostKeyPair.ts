// src/lib/crypto/generateGostKeyPair.ts
// ГЕНЕРАЦИЯ долговременной транспортной пары ECIES-GOST-2012-256 на твоей кривой.
// Используются твои функции/константы из gost/ec.ts.

import { G, q, ecMul, ECPoint, pointSerialize } from "./gost/ec";

function b64u(bytes: Uint8Array): string {
  let s = typeof window === "undefined"
    ? Buffer.from(bytes).toString("base64")
    : btoa(String.fromCharCode(...bytes));
  return s.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// L = длина координаты в байтах (по порядку q)
function coordLen(): number {
  // pointSerialize выдаёт 2*L байт для точки
  const test = pointSerialize(G);
  return Math.floor(test.length / 2);
}

// Генерация случайного скаляра d из [1..q-1] с отказом при выходе за диапазон
function randomScalar(): bigint {
  const L = Math.ceil((q.toString(2).length) / 8); // байт на q
  for (let i = 0; i < 64; i++) {
    const buf = new Uint8Array(L);
    crypto.getRandomValues(buf);
    let d = 0n;
    for (const b of buf) d = (d << 8n) + BigInt(b);
    d = d % (q - 1n) + 1n; // [1..q-1]
    if (d > 0n && d < q) return d;
  }
  // fallback (крайне маловероятно)
  return 1n;
}

export async function generateGostKeyPair(): Promise<{
  publicJwk: JsonWebKey;
  privateJwk: JsonWebKey;
}> {
  const d = randomScalar();
  const Q: ECPoint = ecMul(G, d); // публичная точка

  // Сериализуем координаты
  const L = coordLen();
  const packed = pointSerialize(Q);             // [x||y], 2*L байт
  const x = packed.slice(0, L);
  const y = packed.slice(L, 2 * L);

  // d → фиксированной длины L (big-endian)
  const dBytes = new Uint8Array(L);
  let tmp = d;
  for (let i = L - 1; i >= 0; i--) {
    dBytes[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }

  // Формируем JWK (совместимо с твоим fingerprint.tsx — он ждёт kty, crv, x, y [, d])
  const crv = "GOST-2012-256"; // единообразно с проектом
  const publicJwk: JsonWebKey = {
    kty: "EC",
    crv,
    x: b64u(x),
    y: b64u(y),
    alg: "ECIES-GOST-2012-256",
    key_ops: ["encrypt", "wrapKey"], // транспорт
    ext: true,
  };

  const privateJwk: JsonWebKey = {
    ...publicJwk,
    d: b64u(dBytes),
    key_ops: ["decrypt", "unwrapKey"],
  };

  return { publicJwk, privateJwk };
}
