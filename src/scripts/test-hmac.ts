import { hmacGost } from '..//lib/crypto/functions';

const payload = 'test-message';
// const key = process.env.HMAC_SECRET_GOST!;
const key = '123';
if (!key) {
  console.error('HMAC_SECRET_GOST не задан');
  process.exit(1);
}

console.log('SIGNATURE:', hmacGost(payload, key, { name: 'GOST R 34.11', version: 2012, length: 256 }));