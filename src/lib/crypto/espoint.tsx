// lib/gost-ec.ts
// EC math + GOST R 34.10-2012 (256) signer for Next.js / Node / browser
// No external deps. BigInt-based.

export type Curve = {
  p: bigint; a: bigint; b: bigint; q: bigint; gx: bigint; gy: bigint;
};

export type ECPointLike = { x: bigint|null; y: bigint|null };

export class ECPoint {
  x: bigint|null;
  y: bigint|null;
  a: bigint; b: bigint; p: bigint;

  constructor(x: bigint|null, y: bigint|null, a: bigint, b: bigint, p: bigint) {
    this.x = x; this.y = y; this.a = a; this.b = b; this.p = p;
  }

  static infinity(a: bigint, b: bigint, p: bigint): ECPoint {
    return new ECPoint(null, null, a, b, p);
  }

  isInfinity(): boolean { return this.x === null || this.y === null; }

  neg(): ECPoint {
    if (this.isInfinity()) return this;
    const { p, a, b } = this;
    const y = mod(-this.y!, p);
    return new ECPoint(this.x!, y, a, b, p);
  }

  // P + Q
  add(Q: ECPoint): ECPoint {
    const P = this;
    const { p, a, b } = P;

    if (P.isInfinity()) return Q;
    if (Q.isInfinity()) return P;

    const x1 = P.x!, y1 = P.y!;
    const x2 = Q.x!, y2 = Q.y!;

    if (x1 === x2) {
      // P == Q  -> double,  if y1 == -y2 -> O
      if (mod(y1 + y2, p) === 0n) return ECPoint.infinity(a, b, p);
      return P.double();
    }

    const lam = mod( (y2 - y1) * invmod(x2 - x1, p), p );
    const x3  = mod(lam * lam - x1 - x2, p);
    const y3  = mod(lam * (x1 - x3) - y1, p);
    return new ECPoint(x3, y3, a, b, p);
  }

  // 2P
  double(): ECPoint {
    const P = this;
    if (P.isInfinity()) return P;
    const { p, a, b } = P;
    const x1 = P.x!, y1 = P.y!;
    const lam = mod( (3n * x1 * x1 + a) * invmod(2n * y1, p), p );
    const x3  = mod(lam * lam - 2n * x1, p);
    const y3  = mod(lam * (x1 - x3) - y1, p);
    return new ECPoint(x3, y3, a, b, p);
  }

  // k * P  (double-and-add)
    mul(k: bigint): ECPoint {
    const { a, b, p } = this;
    if (k === 0n) return ECPoint.infinity(a, b, p);
    if (k < 0n) return this.neg().mul(-k);
    let result: ECPoint = ECPoint.infinity(a, b, p);
    let addend: ECPoint = this;
    let n = k;
    while (n > 0n) {
        if (n & 1n) result = result.add(addend);
        addend = addend.double();
        n >>= 1n;
    }
    return result;
    }
}

export class DSGOST {
  readonly G: ECPoint;
  readonly q: bigint;
  readonly a: bigint;
  readonly b: bigint;
  readonly p: bigint;

  constructor(curve: Curve) {
    this.G = new ECPoint(curve.gx, curve.gy, curve.a, curve.b, curve.p);
    this.q = curve.q; this.a = curve.a; this.b = curve.b; this.p = curve.p;
  }

  // d in [1..q-1], Q = d*G
  genKeys(rng: (n: number)=>Uint8Array = defaultRng): { d: bigint; Q: ECPoint } {
    const d = randScalar(this.q, rng);
    const Q = this.G.mul(d);
    return { d, Q };
  }

  // Sign per GOST 34.10-2012 (256)
  // message: bigint (that's your e already), privateKey: bigint
  sign(message: bigint, privateKey: bigint, rng: (n:number)=>Uint8Array = defaultRng): { r: bigint; s: bigint } {
    const q = this.q;
    let e = mod(message, q); if (e === 0n) e = 1n;

    while (true) {
      const k = randScalar(q, rng);
      const C = this.G.mul(k);
      const r = mod(C.x!, q);
      const s = mod(r * privateKey + k * e, q);
      if (r !== 0n && s !== 0n) return { r, s };
    }
  }

  // Verify
  verify(message: bigint, sig: {r: bigint; s: bigint}, Q: ECPoint): boolean {
    const q = this.q;
    let e = mod(message, q); if (e === 0n) e = 1n;

    const nu = invmod(e, q);
    const z1 = mod(sig.s * nu, q);
    const z2 = mod(-sig.r * nu, q);

    const C = this.G.mul(z1).add(Q.mul(z2));
    if (C.isInfinity()) return false;

    const r = mod(C.x!, q);
    return r === sig.r;
  }
}

/* ========================= Helpers ========================= */

export function mod(a: bigint, m: bigint): bigint {
  const r = a % m;
  return r >= 0n ? r : r + m;
}

// Extended Euclid for modular inverse (works with BigInt)
export function invmod(a: bigint, m: bigint): bigint {
  let t = 0n, newT = 1n;
  let r = mod(m, m), newR = mod(a, m);
  // r = m, newR = a
  r = m; newR = mod(a, m);
  while (newR !== 0n) {
    const q = r / newR;
    [t, newT]   = [newT, t - q * newT];
    [r, newR]   = [newR, r - q * newR];
  }
  if (r !== 1n) throw new Error("invmod: not invertible");
  if (t < 0n) t += m;
  return t;
}

export function hexToBigInt(hex: string): bigint {
  return BigInt(hex.startsWith("0x") ? hex : "0x"+hex);
}
export function bigIntToHex32(x: bigint): string {
  let h = x.toString(16); if (h.length < 64) h = h.padStart(64, "0"); return h;
}

export function defaultRng(n: number): Uint8Array {
  if (typeof crypto !== "undefined" && (crypto as any).getRandomValues) {
    const b = new Uint8Array(n); (crypto as any).getRandomValues(b); return b;
  } else {
    // Node
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { randomBytes } = require("crypto");
    return randomBytes(n);
  }
}

export function randScalar(q: bigint, rng: (n:number)=>Uint8Array = defaultRng): bigint {
  // 256-bit random then reduce to [1..q-1]
  const b = rng(32);
  let x = 0n; for (const v of b) x = (x<<8n) + BigInt(v);
  x = mod(x, q - 1n) + 1n;
  return x;
}

/* ========== Glue for the previous X.509 builder ========== */

// 1) Derive public Q for subject by private key
export function derivePublicQ(dPrivHex: string, curve: Curve): { QxHex: string; QyHex: string } {
  const d = hexToBigInt(dPrivHex);
  const ds = new DSGOST(curve);
  const Q = ds.G.mul(d);
  return { QxHex: bigIntToHex32(Q.x!), QyHex: bigIntToHex32(Q.y!) };
}

// 2) Signer callback compatible with issueGost256Certificate()
// e — это уже little-endian интерпретированный хэш (как в твоём коде).
export async function gostSigner256(
  e: bigint,
  dIssuer: bigint,
  curve: Curve,
  rng: (n:number)=>Uint8Array = defaultRng
): Promise<{ r: bigint; s: bigint }> {
  const ds = new DSGOST(curve);
  return ds.sign(e, dIssuer, rng);
}

/* ========== Example built-in CryptoPro-A params (the same numbers) ========== */

export const CryptoProA_2012_256: Curve = {
  p:  BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD97"),
  a:  BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD94"),
  b:  BigInt(0xA6),
  q:  BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF6C611070995AD10045841B09B761B893"),
  gx: BigInt(0x01),
  gy: BigInt("0x8D91E471E0989CDA27DF505A453F2B7635294F2DDF23E3B122ACC99C9E9F1E14"),
};
