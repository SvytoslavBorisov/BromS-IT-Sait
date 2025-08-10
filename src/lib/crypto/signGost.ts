import { randomBytes, createHash } from 'crypto';
import BN from 'bn.js';
import { DOMAIN_PARAMS, gostCurve } from './gost_curve';

/** Быстрый SHA-256 → hex */
function sha256hex(msg: string): string {
  return createHash('sha256').update(msg, 'utf8').digest('hex');
}

/** Случайный скаляр k ∈ [1, q−1] */
function randomScalar(): BN {
  const q = DOMAIN_PARAMS.q;
  let k: BN;
  do {
    k = new BN(randomBytes(q.byteLength()));
  } while (k.isZero() || k.gte(q));
  return k;
}

/** Подписать message, СЕРЕЗНО: теперь с SHA-256 */
export function signGost(
  privateHex: string,
  message: string
): { r: string; s: string } {
  const q = DOMAIN_PARAMS.q;
  // 1) SHA-256, а не ГОСТ-хеш
  const H = new BN(sha256hex(message), 16).mod(q);
  const d = new BN(privateHex, 16);

  let r: BN, s: BN;
  do {
    const k = randomScalar();
    const R = gostCurve.g.mul(k);
    r = R.getX().mod(q);
    s = d.mul(r).add(k.mul(H)).mod(q);
  } while (r.isZero() || s.isZero());

  const hexLen = q.byteLength() * 2;
  return {
    r: r.toString(16).padStart(hexLen, '0'),
    s: s.toString(16).padStart(hexLen, '0'),
  };
}

/** Проверить подпись, тоже с SHA-256 */
export function verifyGost(
  publicHex: string,
  message: string,
  rHex: string,
  sHex: string
): boolean {
  const q = DOMAIN_PARAMS.q;
  const hexLen = q.byteLength() * 2;

  if (rHex.length !== hexLen || sHex.length !== hexLen) return false;
  const r = new BN(rHex, 16);
  const s = new BN(sHex, 16);
  if (r.isZero() || r.gte(q) || s.isZero() || s.gte(q)) return false;

  const H = new BN(sha256hex(message), 16).mod(q);

  const xHex = publicHex.slice(0, hexLen);
  const yHex = publicHex.slice(hexLen);
  const Q = gostCurve.point(new BN(xHex, 16), new BN(yHex, 16));

  const rInv = r.invm(q);
  const u1 = H.mul(rInv).mod(q);
  const u2 = q.sub(s).mul(rInv).mod(q);

  const R = gostCurve.g.mul(u1).add(Q.mul(u2));
  return R.getX().mod(q).eq(r);
}