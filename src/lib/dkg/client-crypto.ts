// src/lib/dkg/client-crypto.ts
import { q, G, ECPoint, ecMul, ecAdd, pointSerialize, pointDeserialize } from "@/lib/crypto/gost/ec";
import { H256 } from "@/lib/crypto/hmac_gost";
import { bytesConcat, enc } from "@/lib/crypto/bigint-utils";
import { ThresholdECIES } from "@/lib/crypto/ecies_threshold";
import { hkdfLike, Hmac256, streamXor } from "@/lib/crypto/hmac_gost";

// --- базовые утилы ---
export const hex = {
  toBytes(h: string) { return new Uint8Array(h.match(/.{1,2}/g)!.map(b => parseInt(b, 16))); },
  fromBytes(b: Uint8Array) { return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join(""); },
};
export const bn = {
  toHex(bi: bigint) { return bi.toString(16); },
  fromHex(h: string) { return BigInt("0x" + h); },
};

function randBelow(modulus: bigint): bigint {
  // демо-рандом; для продакшна замените на криптостойкое число
  let r = 0n;
  for (let i = 0; i < 8; i++) r = (r << 32n) + BigInt((Math.random() * 0xffffffff) >>> 0);
  return (r % (modulus - 1n)) + 1n;
}

// --- многочлен участника ---
export type Poly = { coeffs: bigint[] }; // длины t: [a0..a_{t-1}]
export function polyGenerate(t: number): Poly {
  const coeffs = Array.from({ length: t }, () => randBelow(q));
  return { coeffs };
}
export function polyCommitments(poly: Poly): ECPoint[] {
  return poly.coeffs.map(a => ecMul(G, a));
}
export function polyEvalAt(poly: Poly, xIdx: number): bigint {
  const x = BigInt(xIdx) % q;
  let acc = 0n, pwr = 1n;
  for (const a of poly.coeffs) { acc = (acc + a * pwr) % q; pwr = (pwr * x) % q; }
  return acc;
}

// --- проверка доли Feldman ---
export function verifyShare(i: number, s_ji: bigint, commitments_j: ECPoint[]): boolean {
  const left = ecMul(G, s_ji % q);
  let right: ECPoint = { x: null, y: null };
  let pwr = 1n;
  for (let k = 0; k < commitments_j.length; k++) {
    const term = ecMul(commitments_j[k], BigInt(pwr));
    right = ecAdd(right, term);
    pwr = (pwr * BigInt(i)) % q;
  }
  return left.x === right.x && left.y === right.y;
}

// --- Q = сумма C_j[0] ---
export function computeQ(allCommitments: ECPoint[][]): ECPoint {
  return allCommitments.reduce((acc, Cj) => ecAdd(acc, Cj[0]), { x: null, y: null } as ECPoint);
}
export function qHashHex(Q: ECPoint): string {
  return Buffer.from(H256(pointSerialize(Q))).toString("hex");
}

// --- e2e-ключи транспорта (локально) ---
const LS_SK = "e2e_sk_hex";
const LS_PK = "e2e_pk_hex";
export function ensureE2EKeypair(): { skHex: string; pkHex: string } {
  let skHex = localStorage.getItem(LS_SK);
  let pkHex = localStorage.getItem(LS_PK);
  if (!skHex || !pkHex) {
    const sk = randBelow(q);
    const pk = ecMul(G, sk);
    skHex = sk.toString(16);
    pkHex = hex.fromBytes(pointSerialize(pk));
    localStorage.setItem(LS_SK, skHex);
    localStorage.setItem(LS_PK, pkHex);
  }
  return { skHex, pkHex };
}
export function getE2ESecret(): bigint | null {
  const skHex = localStorage.getItem(LS_SK);
  return skHex ? bn.fromHex(skHex) : null;
}

// --- сериализация долей ---
export function serializeShare(sessionId: string, fromUserId: string, toUserId: string, sji: bigint) {
  const body = JSON.stringify({ sessionId, from: fromUserId, to: toUserId, s: sji.toString(16) });
  return enc.encode(body);
}
// подсчёт transcriptHash (на ваше усмотрение)
export function transcriptHashHex(obj: any): string {
  const data = enc.encode(JSON.stringify(obj));
  return Buffer.from(H256(data)).toString("hex");
}

// ====== ECIES transport: собственная реализация на публичных примитивах ======
export type TransportCipher = { R: ECPoint; ct: Uint8Array; tag: Uint8Array };

// KDF (симметрична для encrypt/decrypt)
function kdfECIES(Z: ECPoint, aad: Uint8Array) {
  const seed = H256(bytesConcat(
    enc.encode("ECIES-SEED"),
    pointSerialize(Z),
    aad
  ));
  const [okm1, okm2] = hkdfLike(seed, enc.encode("ECIES-CTX"), 2);
  const k_enc = okm1.slice(0, 32);
  const iv    = okm1.slice(32, 48); // 16 байт "nonce"/счётчик (достаточно для streamXor)
  const k_mac = okm2.slice(0, 32);
  return { k_enc, iv, k_mac };
}

// MAC формируем как HMAC(k_mac, aad || ser(R) || ct)
function macECIES(k_mac: Uint8Array, aad: Uint8Array, R: ECPoint, ct: Uint8Array) {
  return Hmac256(k_mac, bytesConcat(aad, pointSerialize(R), ct));
}

// Шифрование на публичный ключ получателя Q
export function encryptToPk(recipientPkHex: string, plaintext: Uint8Array, aad: Uint8Array): TransportCipher {
  // 1) R = rG, Z = rQ
  const Q = pointDeserialize(hex.toBytes(recipientPkHex));
  const r = randBelow(q);
  const R = ecMul(G, r);
  const Z = ecMul(Q, r);

  // 2) KDF -> k_enc, iv, k_mac
  const { k_enc, iv, k_mac } = kdfECIES(Z, aad);

  // 3) Поточное шифрование и MAC
  const ct  = streamXor(k_enc, iv, plaintext);
  const tag = macECIES(k_mac, aad, R, ct);

  return { R, ct, tag };
}

// Расшифровка локальным секретом sk (sk — наш e2e private)
export function decryptWithSk(skHex: string, ct: TransportCipher, aad: Uint8Array): Uint8Array {
  // 1) Z = sk * R
  const sk = BigInt("0x" + skHex);
  const Z  = ecMul(ct.R, sk);

  // 2) KDF
  const { k_enc, iv, k_mac } = kdfECIES(Z, aad);

  // 3) Проверка MAC
  const expect = macECIES(k_mac, aad, ct.R, ct.ct);
  if (Buffer.from(expect).toString("hex") !== Buffer.from(ct.tag).toString("hex")) {
    throw new Error("ECIES MAC failed");
  }

  // 4) Дешифрование
  return streamXor(k_enc, iv, ct.ct);
}