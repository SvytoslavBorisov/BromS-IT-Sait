// src/lib/crypto/lagrange.ts
import { q } from "./gost/ec";
import { mod, modInv } from "./bigint-utils";

export function lagrangeAtZero(indices: number[]): Record<number, bigint> {
  const S = indices.slice();
  const lam: Record<number, bigint> = {};
  for (const i of S) {
    let num = 1n, den = 1n;
    for (const j of S) {
      if (j === i) continue;
      num = mod(num * mod(-BigInt(j), q), q);
      den = mod(den * mod(BigInt(i - j), q), q);
    }
    lam[i] = mod(num * modInv(den, q), q);
  }
  return lam;
}
