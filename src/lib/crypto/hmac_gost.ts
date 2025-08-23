// src/lib/crypto/hmac_gost.ts
import { createStreebog256, streebog256, streebog512 } from "@/lib/crypto/streebog";
import { bytesConcat, enc, u32be } from "./bigint-utils";

const BLOCK = 64; // HMAC блок для Стрибог-256: 512 бит

function hmacStreebog256Raw(key: Uint8Array, data: Uint8Array): Uint8Array {
  let k = key;
  if (k.length > BLOCK) k = streebog256(k);
  if (k.length < BLOCK) {
    const kk = new Uint8Array(BLOCK); kk.set(k); k = kk;
  }
  const oKeyPad = new Uint8Array(BLOCK);
  const iKeyPad = new Uint8Array(BLOCK);
  for (let i = 0; i < BLOCK; i++) { oKeyPad[i] = k[i] ^ 0x5c; iKeyPad[i] = k[i] ^ 0x36; }
  const inner = streebog256(bytesConcat(iKeyPad, data));
  return streebog256(bytesConcat(oKeyPad, inner));
}

export function H256(data: Uint8Array): Uint8Array { return streebog256(data); }
export function H512(data: Uint8Array): Uint8Array { return streebog512(data); }
export function Hmac256(key: Uint8Array, data: Uint8Array): Uint8Array { return hmacStreebog256Raw(key, data); }

/** HKDF-подобная деривация из seed: возвращает массив блоков по 32 байта. */
export function hkdfLike(seed: Uint8Array, info: Uint8Array, blocks: number): Uint8Array[] {
  const prk = Hmac256(enc.encode("HKDF-STREEBOG"), seed); // упрощённый salt
  const out: Uint8Array[] = [];
  let t = new Uint8Array(0);
  for (let i = 1; i <= blocks; i++) {
    t = Hmac256(prk, bytesConcat(t, info, new Uint8Array([i])));
    out.push(t);
  }
  return out;
}

/** Стрим-шифрование «XOR с HMAC-блоками», без внешних зависимостей. */
export function streamXor(key: Uint8Array, nonce: Uint8Array, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length);
  const blockSize = 32;
  const blocks = Math.ceil(data.length / blockSize);
  let pos = 0;
  for (let i = 0; i < blocks; i++) {
    const ks = Hmac256(key, bytesConcat(nonce, u32be(i)));
    const take = Math.min(blockSize, data.length - pos);
    for (let j = 0; j < take; j++) out[pos + j] = data[pos + j] ^ ks[j];
    pos += take;
  }
  return out;
}
