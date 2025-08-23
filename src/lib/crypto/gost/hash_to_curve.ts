// src/lib/crypto/gost/hash_to_curve.ts
import { H512 } from "../hmac_gost";
import { ECPoint, a, b, ecAdd, ecMul, G, onCurve, p } from "./ec";
import { bigintToBytes, bytesConcat, bytesToBigint, mod, modPow, u16be, u32be } from "../bigint-utils";

const DST = new TextEncoder().encode("HTC:TC26-Gost-2001-CryptoPro-A");

export function hashToCurvePoint(epoch: Uint8Array, j: number, aad: Uint8Array): ECPoint {
  for (let ctr = 0; ctr < 1 << 16; ctr++) {
    const digest = H512(bytesConcat(DST, epoch, u32be(j), aad, u16be(ctr)));
    const x = mod(bytesToBigint(digest), p);
    const rhs = mod(modPow(x, 3n, p) + mod(a * x, p) + b, p);
    if (rhs === 0n) {
      const P = { x, y: 0n };
      if (onCurve(P)) return P;
    }
    // p % 4 == 3 => sqrt = rhs^((p+1)/4)
    if (modPow(rhs, (p - 1n) / 2n, p) === 1n) {
      const y = modPow(rhs, (p + 1n) / 4n, p);
      const P = { x, y };
      if (onCurve(P)) return P;
    }
  }
  throw new Error("hashToCurvePoint: failed");
}
