// src/lib/crypto/gost/ec.ts
import { bigintToBytes, bitLen, bytesToBigint, mod, modInv, modPow } from "../bigint-utils";

export type ECPoint = { x: bigint | null; y: bigint | null };
export const INF: ECPoint = { x: null, y: null };

export const p  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD97n;
export const a  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD94n; // p-3
export const b  = 0xA6n;
export const q  = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF6C611070995AD10045841B09B761B893n;
export const Gx = 0x01n;
export const Gy = 0x8D91E471E0989CDA27DF505A453F2B7635294F2DDF23E3B122ACC99C9E9F1E14n;
export const G: ECPoint = { x: Gx, y: Gy };

export function isInf(P: ECPoint): boolean { return P.x === null || P.y === null; }

export function onCurve(P: ECPoint): boolean {
  if (isInf(P)) return true;
  const x = P.x!, y = P.y!;
  const left  = mod(y * y, p);
  const right = mod(modPow(x, 3n, p) + mod(a * x, p) + b, p);
  return left === right;
}

export function ecAdd(P: ECPoint, Q: ECPoint): ECPoint {
  if (isInf(P)) return Q;
  if (isInf(Q)) return P;
  const x1 = P.x!, y1 = P.y!, x2 = Q.x!, y2 = Q.y!;
  if (x1 === x2) {
    if (mod(y1 + y2, p) === 0n) return INF;
    const lam = mod((3n * x1 * x1 + a) * modInv(2n * y1, p), p);
    const xr = mod(lam * lam - x1 - x2, p);
    const yr = mod(lam * (x1 - xr) - y1, p);
    return { x: xr, y: yr };
  }
  const lam = mod((y2 - y1) * modInv(x2 - x1, p), p);
  const xr = mod(lam * lam - x1 - x2, p);
  const yr = mod(lam * (x1 - xr) - y1, p);
  return { x: xr, y: yr };
}

export function ecMul(P: ECPoint, k: bigint): ECPoint {
  k = mod(k, q);
  if (k === 0n || isInf(P)) return INF;
  let R = INF, Qp = P;
  while (k > 0n) {
    if (k & 1n) R = ecAdd(R, Qp);
    Qp = ecAdd(Qp, Qp);
    k >>= 1n;
  }
  return R;
}

export function ecLinComb(points: ECPoint[], scalars: bigint[]): ECPoint {
  let R = INF;
  for (let i = 0; i < points.length; i++) {
    const s = mod(scalars[i], q);
    if (s === 0n || isInf(points[i])) continue;
    R = ecAdd(R, ecMul(points[i], s));
  }
  return R;
}

export function pointSerialize(P: ECPoint): Uint8Array {
  const L = Math.ceil(bitLen(q) / 8);
  if (isInf(P)) return new Uint8Array(2 * L);
  const xb = bigintToBytes(mod(P.x!, p), L);
  const yb = bigintToBytes(mod(P.y!, p), L);
  const out = new Uint8Array(2 * L);
  out.set(xb, 0); out.set(yb, L);
  return out;
}

export function pointDeserialize(buf: Uint8Array): ECPoint {
  const L = Math.ceil(bitLen(q) / 8);
  const x = bytesToBigint(buf.slice(0, L));
  const y = bytesToBigint(buf.slice(L, 2 * L));
  return { x, y };
}
