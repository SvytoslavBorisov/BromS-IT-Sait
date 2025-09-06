// verifyInitData.js  (ESM)
import crypto from 'crypto';

/** Парсим initData (user там в JSON) */
export function parseInitData(initData = '') {
  const out = {};
  const sp = new URLSearchParams(initData);
  for (const [k, v] of sp) out[k] = v;
  if (out.user) { try { out.user = JSON.parse(out.user); } catch {} }
  return out;
}

/** Универсальная проверка подписи initData (поддерживает оба варианта ключа) */
export function verifyInitData(initData, botToken) {
  if (!initData || !botToken) return false;

  const sp = new URLSearchParams(initData);
  const hash = sp.get('hash');
  if (!hash) return false;

  sp.delete('hash');
  const pairs = Array.from(sp.entries())
    .map(([k, v]) => `${k}=${v}`)
    .sort();
  const dataCheckString = pairs.join('\n');

  const sha256Bot = crypto.createHash('sha256').update(botToken).digest();
  // v1: secret = sha256(botToken)
  const calc1 = crypto.createHmac('sha256', sha256Bot).update(dataCheckString).digest('hex');
  // v2: secret = HMAC_SHA256("WebAppData", sha256(botToken))
  const secret2 = crypto.createHmac('sha256', 'WebAppData').update(sha256Bot).digest();
  const calc2 = crypto.createHmac('sha256', secret2).update(dataCheckString).digest('hex');

  const a = Buffer.from(hash, 'hex');
  const b1 = Buffer.from(calc1, 'hex');
  const b2 = Buffer.from(calc2, 'hex');

  const eq = (x, y) => x.length === y.length && crypto.timingSafeEqual(x, y);
  return eq(a, b1) || eq(a, b2);
}
