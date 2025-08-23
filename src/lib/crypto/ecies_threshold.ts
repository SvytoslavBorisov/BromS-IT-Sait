// src/lib/crypto/ecies_threshold.ts
import { ECPoint, G, ecAdd, ecMul, pointSerialize } from "./gost/ec";
import { lagrangeAtZero } from "./lagrange";
import { H256, H512, Hmac256, hkdfLike, streamXor } from "./hmac_gost";
import { bytesConcat } from "./bigint-utils";
import { q } from "./gost/ec";

export type ECIESCiphertext = { R: ECPoint; ct: Uint8Array; tag: Uint8Array };

function randScalar(): bigint {
  let r = 0n;
  for (let i = 0; i < 6; i++) r = (r << 32n) + BigInt((Math.random() * 0xffffffff) >>> 0);
  return (r % (q - 1n)) + 1n;
}

export class ThresholdECIES {
  private static kdf(Z: ECPoint, aad: Uint8Array) {
    const zBytes = pointSerialize(Z);
    const seed = H256(bytesConcat(new TextEncoder().encode("ECIES-TC26"), aad));
    const [okm1, okm2, okm3] = hkdfLike(zBytes, seed, 3);
    const k_enc = okm1.slice(0, 32);
    const iv    = okm2.slice(0, 16); // nonce для streamXor
    const k_mac = okm3.slice(0, 32);
    return { k_enc, iv, k_mac };
  }

  private static mac(macKey: Uint8Array, aad: Uint8Array, R: ECPoint, ct: Uint8Array): Uint8Array {
    return Hmac256(macKey, bytesConcat(aad, pointSerialize(R), ct));
  }

  encrypt(Q: ECPoint, plaintext: Uint8Array, aad: Uint8Array = new Uint8Array(0)): ECIESCiphertext {
    const r = randScalar();
    const R = ecMul(G, r);
    const Z = ecMul(Q, r);
    const { k_enc, iv, k_mac } = ThresholdECIES.kdf(Z, aad);
    const ct = streamXor(k_enc, iv, plaintext);
    const tag = ThresholdECIES.mac(k_mac, aad, R, ct);
    return { R, ct, tag };
  }

  static participantPartial(pid: number, s_i: bigint, R: ECPoint, S: number[]): ECPoint {
    const S_sorted = S.slice().sort((a, b) => a - b);
    const lam = lagrangeAtZero(S_sorted)[pid];
    const scal = (lam * s_i) % q;
    return ecMul(R, scal);
  }

  static combinePartials(partials: ECPoint[]): ECPoint {
    return partials.reduce((acc, P) => ecAdd(acc, P), { x: null, y: null } as ECPoint);
  }

  decryptWithPartials(ciphertext: ECIESCiphertext, partials: ECPoint[], aad: Uint8Array = new Uint8Array(0)): Uint8Array {
    const Z = ThresholdECIES.combinePartials(partials);
    const { k_enc, iv, k_mac } = ThresholdECIES.kdf(Z, aad);
    const expect = ThresholdECIES.mac(k_mac, aad, ciphertext.R, ciphertext.ct);
    if (Buffer.from(expect).toString("hex") !== Buffer.from(ciphertext.tag).toString("hex"))
      throw new Error("ECIES MAC verification failed");
    return streamXor(k_enc, iv, ciphertext.ct);
  }
}
