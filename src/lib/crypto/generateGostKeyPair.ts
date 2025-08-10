// generateGostKeyPair.ts
import { randomBytes } from 'crypto';
import BN from 'bn.js';
import { DOMAIN_PARAMS, gostCurve } from './gost_curve';  // единая кривая

/** Генерация случайного скаляра d ∈ [1, q−1] */
function randomScalar(): BN {
  const q = DOMAIN_PARAMS.q;
  let d: BN;
  do {
    d = new BN(randomBytes(q.byteLength()));
  } while (d.isZero() || d.gte(q));
  return d;
}

/** 
 * Генерация пары ключей GOST R 34.10-2001/2012 на кривой CryptoPro A 
 * privateKey — 64 hex символа, publicKey — 128 hex символов (x||y) 
 */
export function generateGostKeyPair(): { privateKey: string; publicKey: string } {
  // 1) Случайный d
  const d = randomScalar();

  // 2) Q = d·G на той же кривой gostCurve
  const R = gostCurve.g.mul(d);

  // 3) Паддинг до 64 hex-символов (32 байта)
  const hexLen = DOMAIN_PARAMS.q.byteLength() * 2;
  const xHex = R.getX().toString(16).padStart(hexLen, '0');
  const yHex = R.getY().toString(16).padStart(hexLen, '0');

  return {
    privateKey: d.toString(16).padStart(hexLen, '0'),
    publicKey:  xHex + yHex,
  };
}
