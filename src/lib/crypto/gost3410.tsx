import { randomBytes } from 'crypto';
import BN from 'bn.js';
import { HashCalculator } from '@/lib/crypto/gost3411-2012';

// Доменные параметры (из вашего примера)
export const DOMAIN_PARAMS = {
  // модуль поля p
  p:  new BN(
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD97',
    16
  ),

  // коэффициент a в уравнении y^2 = x^3 + a x + b
  a:  new BN(
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD94',
    16
  ),

  // коэффициент b
  b:  new BN(
    'A6',
    16
  ),

  // порядок подгруппы q
  q:  new BN(
    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF6C611070995AD10045841B09B761B893',
    16
  ),

  // координаты базовой точки G = (x, y)
  xp: new BN(
    '1',
    16
  ),
  yp: new BN(
    '8D91E471E098A6E7F61F8E2C8BF60414FABF0A90E6B80D5F8E76FA4CC6F7616E',
    16
  ),
};

// Точка на кривой
interface Point { x: BN; y: BN; }

// Базовая точка G
const G: Point = { x: DOMAIN_PARAMS.xp, y: DOMAIN_PARAMS.yp };
const p = DOMAIN_PARAMS.p;
const a = DOMAIN_PARAMS.a;
const b = DOMAIN_PARAMS.b;
const q = DOMAIN_PARAMS.q;

// Модульное обратное a^{-1} mod p
function inv(a: BN): BN {
  return a.invm(p);
}

// Сложение точек P + Q
function pointAdd(P: Point, Q: Point): Point {
  if (P.x.eq(Q.x) && P.y.eq(Q.y)) {
    return pointDouble(P);
  }
  const lambda = Q.y.sub(P.y).mul(Q.x.sub(P.x).invm(p)).mod(p);
  const x3 = lambda.pow(new BN(2)).sub(P.x).sub(Q.x).mod(p);
  const y3 = lambda.mul(P.x.sub(x3)).sub(P.y).mod(p);
  return { x: x3, y: y3 };
}

// Удвоение точки P => 2P
function pointDouble(P: Point): Point {
  const num = P.x.pow(new BN(2)).mul(new BN(3)).add(a).mod(p);
  const den = P.y.mul(new BN(2)).invm(p);
  const lambda = num.mul(den).mod(p);
  const x3 = lambda.pow(new BN(2)).sub(P.x.mul(new BN(2))).mod(p);
  const y3 = lambda.mul(P.x.sub(x3)).sub(P.y).mod(p);
  return { x: x3, y: y3 };
}

// Умножение точки P на скаляр k (double-and-add)
function scalarMul(k: BN, P: Point): Point {
  let R: Point | null = null;
  let Qp = P;
  for (let i = k.bitLength() - 1; i >= 0; i--) {
    if (R) {
      R = pointDouble(R);
    }
    if (k.testn(i)) {
      R = R ? pointAdd(R, Qp) : Qp;
    }
  }
  if (!R) throw new Error('Infinity');
  return R;
}

// Преобразование хеша в целое [1,q-1]
function hashToInt(message: string): BN {
  let h = new BN(new HashCalculator('0', 'str', message).run(), 16).mod(q);
  return h.isZero() ? new BN(1) : h;
}

type KeyPair = {
  privateKey: string;
  publicKey: string; // x||y hex
  p: string; a: string; b: string; m: string; q: string;
  xp: string; yp: string; Q: string; Qx: string; Qy: string
};

function generatePrivateScalar(): BN {
  const q = DOMAIN_PARAMS.q;
  let d: BN;
  do {
    const buf = randomBytes(q.byteLength());
    d = new BN(buf);
  } while (d.isZero() || d.gte(q));
  return d;
}

// Генерация ключевой пары
export function generateGostKeyPair(): KeyPair {
  // 1) Генерируем приватный ключ d
  const d = generatePrivateScalar();
  // 2) Вычисляем Q = d·G вручную
  const Qpt = scalarMul(d, G);
  // 3) Форматируем ключи в HEX
  const coordLen = q.byteLength() * 2;
  const privateKey = d.toString(16).padStart(coordLen, '0');
  const xHex = Qpt.x.toString(16).padStart(coordLen, '0');
  const yHex = Qpt.y.toString(16).padStart(coordLen, '0');
  const publicKey = xHex + yHex;

  return {
    privateKey,
    publicKey: xHex + yHex.substring(1),
    p: DOMAIN_PARAMS.p.toString(16),
    a: DOMAIN_PARAMS.a.toString(16),
    b: DOMAIN_PARAMS.b.toString(16),
    m: '0',
    q: DOMAIN_PARAMS.q.toString(16),
    xp: DOMAIN_PARAMS.xp.toString(16),
    yp: DOMAIN_PARAMS.yp.toString(16),
    Q: publicKey,
    Qx: xHex,
    Qy: yHex
  };
}


// Подпись ГОСТ 34.10
export function signGost(privateHex: string, message: string): { r: string; s: string } {
  // Шаг 1—2: e = hashToInt(M)
  const e = hashToInt(message);
  console.log('e', e)
  const d = new BN(privateHex, 16);
  console.log('d', d)
  let r: BN, s: BN;
  do {

    let k: BN;
    do {
      k = new BN(randomBytes(q.byteLength()));
    } while (k.isZero() || k.gte(q));

    const C = scalarMul(k, G);
    console.log('C', C.x, C.y); 
    r = C.x.mod(q);

    const rBI = BigInt('0x' + r.toString(16));
    const dBI = BigInt('0x' + d.toString(16));
    const kBI = BigInt('0x' + k.toString(16));
    const eBI = BigInt('0x' + e.toString(16));
    const qBI = BigInt('0x' + q.toString(16));

    const tBI   = rBI * dBI;
    const sdfBI = kBI * eBI;
    const sumBI = tBI + sdfBI;
    
    let sBI = sumBI % qBI;
    if (sBI < 0n) sBI += qBI;

    s = new BN(sBI.toString(16), 16);

    console.log('r', r, 's', s);
    
  } while (r.isZero() || s.isZero());

  const coordLen = q.byteLength() * 2;
  return { r: r.toString(16).padStart(coordLen, '0'), s: s.toString(16).padStart(coordLen, '0') };
}

// Проверка подписи
export function verifyGost(publicKeyHex: string, message: string, rHex: string, sHex: string): boolean {
  const r = new BN(rHex, 16);
  const s = new BN(sHex, 16);
  if (r.isZero() || r.gte(q) || s.isZero() || s.gte(q)) return false;
  const e = hashToInt(message);
  console.log('e', e)
  const coordLen = q.byteLength() * 2;
  const Q: Point = {
    x: new BN(publicKeyHex.slice(0, coordLen), 16),
    y: new BN(publicKeyHex.slice(coordLen), 16)
  };
  const v = e.invm(q);
  const z1 = s.mul(v).mod(q);
  const z2 = q.sub(r).mul(v).mod(q);
  const C = pointAdd(scalarMul(z1, G), scalarMul(z2, Q));
  return C.x.mod(q).eq(r);
}
