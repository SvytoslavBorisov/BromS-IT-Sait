// src/lib/crypto/dsgost.ts
// EC over prime fields + "DSGOST"-подпись (по твоей формуле e = m mod q)
// Перевод с Python на TypeScript/Next.js (BigInt)

// ---------- утилиты ----------
const ZERO = 0n;
const ONE = 1n;
const TWO = 2n;
const THREE = 3n;

function mod(a: bigint, m: bigint): bigint {
  const r = a % m;
  return r < ZERO ? r + m : r;
}

// Расширенный алгоритм Евклида для обратного по модулю
function egcd(a: bigint, b: bigint): [bigint, bigint, bigint] {
  let x = ZERO, lastX = ONE;
  let y = ONE, lastY = ZERO;
  while (b !== ZERO) {
    const q = a / b;
    [a, b] = [b, a - q * b];
    [lastX, x] = [x, lastX - q * x];
    [lastY, y] = [y, lastY - q * y];
  }
  return [a, lastX, lastY]; // gcd, x, y
}

function modInv(a: bigint, m: bigint): bigint {
  a = mod(a, m);
  const [g, x] = egcd(a, m);
  if (g !== ONE) throw new Error("modInv: not invertible");
  return mod(x, m);
}

// Безопасная генерация случайного bigint в [1, n-1]
function randBetween(n: bigint): bigint {
  if (n <= ONE) throw new Error("randBetween: n must be > 1");
  // Универсально для Next.js: браузерный WebCrypto или Node crypto
  const g: any = globalThis as any;
  const nodeCrypto: any = g.crypto?.getRandomValues ? null : awaitNodeCrypto();

  const byteLen = Math.ceil(Number(n.toString(2).length) / 8);
  while (true) {
    const bytes = new Uint8Array(byteLen);
    if (g.crypto?.getRandomValues) {
      g.crypto.getRandomValues(bytes);
    } else {
      const buf: Buffer = nodeCrypto.randomBytes(byteLen);
      bytes.set(buf);
    }
    let x = ZERO;
    for (const b of bytes) x = (x << 8n) | BigInt(b);
    x = x % n; // отбрасываем смещение
    if (x !== ZERO) return x; // в (1..n-1], но 0 исключаем, см ниже
  }

  function awaitNodeCrypto(): any {
    // динамический импорт для среды Node (Next.js сервер)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("crypto");
  }
}


function strip0x(h: string) {
  return h.replace(/^0x/i, ""); // убирает один префикс
}

function hexToBigInt(h: string): bigint {
  const clean = normalizeHex(h);
  if (clean.length === 0) return 0n;
  return BigInt("0x" + clean);
}

function normalizeHex(h: string) {
  return h.trim().toLowerCase().replace(/^0x/, "");
}


// ---------- точка на эллиптической кривой ----------
export class ECPoint {
  x: bigint | null;
  y: bigint | null;
  a: bigint;
  b: bigint;
  p: bigint;
  // полиномиальная база в исходнике не используется для прайм-поля, но поле сохраним
  polBasis: boolean;

  constructor(
    x: bigint | null,
    y: bigint | null,
    a: bigint,
    b: bigint,
    p: bigint,
    isPolynomialBasis = false
  ) {
    this.x = x;
    this.y = y;
    this.a = a;
    this.b = b;
    this.p = p;
    this.polBasis = isPolynomialBasis;
  }

  static infinity(a: bigint, b: bigint, p: bigint, polBasis = false): ECPoint {
    return new ECPoint(null, null, a, b, p, polBasis);
  }

  isInfinity(): boolean {
    return this.x === null && this.y === null;
  }

  // P + Q
  add(Q: ECPoint): ECPoint {
    if (this.isInfinity()) return Q;
    if (Q.isInfinity()) return this;

    const p = this.p;
    const a = this.a;

    if (this.x === Q.x && this.y === Q.y) {
      return this.double();
    }

    // P + (-P) = O
    if (this.x === Q.x && mod((this.y! + Q.y!), p) === ZERO) {
      return ECPoint.infinity(this.a, this.b, this.p, this.polBasis);
    }

    const lam = mod((Q.y! - this.y!) * modInv(Q.x! - this.x!, p), p);
    const x3 = mod(lam * lam - this.x! - Q.x!, p);
    const y3 = mod(lam * (this.x! - x3) - this.y!, p);
    return new ECPoint(x3, y3, a, this.b, p, this.polBasis);
  }

  // 2P
  double(): ECPoint {
    if (this.isInfinity()) return this;
    const p = this.p;
    const a = this.a;

    const lam = mod((THREE * this.x! * this.x! + a) * modInv(TWO * this.y!, p), p);
    const x3 = mod(lam * lam - TWO * this.x!, p);
    const y3 = mod(lam * (this.x! - x3) - this.y!, p);
    return new ECPoint(x3, y3, a, this.b, p, this.polBasis);
  }

  // k * P (double-and-add)
  mul(k: bigint): ECPoint {
    if (k === ZERO) return ECPoint.infinity(this.a, this.b, this.p, this.polBasis);
    if (k < ZERO) throw new Error("Negative scalar not supported");

    let result = ECPoint.infinity(this.a, this.b, this.p, this.polBasis);
    let addend: ECPoint = this;       // ← начинаем с P, без предварительного double()
    let kk = k;

    while (kk > ZERO) {
      if ((kk & ONE) === ONE) result = result.add(addend);
      addend = addend.double();
      kk >>= 1n;
    }
    return result;
  }

  // --- Ниже порт ф-ий для GF(2^m), в этом алгоритме не используются, оставлены для совместимости ---
  multField(x: bigint, y: bigint, n: bigint): bigint {
    const mask = 1n << BigInt(n.toString(2).length - 2); // как в исходнике
    let yy = y;
    let xx = x;
    let poly = 0n;
    while (xx) {
      if (xx & 1n) poly ^= yy;
      if (yy & mask) yy = (yy << 1n) ^ n;
      else yy <<= 1n;
      xx >>= 1n;
    }
    return poly;
  }

  sumField(...x: bigint[]): bigint {
    return x.reduce((acc, v) => acc ^ v, 0n);
  }

  invField(a: bigint, f: bigint): bigint {
    let u = a, v = f;
    let g1 = 1n, g2 = 0n;
    while (u !== 1n) {
      let j = u.toString(2).length - v.toString(2).length;
      if (j < 0) {
        [u, v] = [v, u];
        [g1, g2] = [g2, g1];
        j = -j;
      }
      u = this.sumField(u, v << BigInt(j));
      g1 = this.sumField(g1, g2 << BigInt(j));
    }
    return g1;
  }
}

// ---------- подпись ----------
export class DSGOST {
  pPoint: ECPoint; // базовая точка
  q: bigint;
  a: bigint;
  b: bigint;
  p: bigint;

  constructor(p: bigint, a: bigint, b: bigint, q: bigint, px: bigint, py: bigint) {
    this.pPoint = new ECPoint(px, py, a, b, p);
    this.q = q;
    this.a = a;
    this.b = b;
    this.p = p;
  }

  // генерация пары ключей
  genKeys(): { d: bigint; Q: ECPoint } {
    const d = randBetween(this.q); // 1..q-1
    const Q = this.pPoint.mul(d);
    return { d, Q };
  }

  // sign: message — bigint; privateKey — bigint
signHex(
  message: string | bigint,
  privateKeyHex: string,
  kHex?: string
): { r: string; s: string } {
  // утилиты (можно вынести за метод, если уже есть)
  const strip0x = (h: string) =>
    h.startsWith("0x") || h.startsWith("0X") ? h.slice(2) : h;
  const hexToBigInt = (h: string) => BigInt("0x" + strip0x(h));
  const toHex = (bn: bigint) => "0x" + bn.toString(16);

  const ZERO = 0n;
  const ONE = 1n;

  // 1) Приводим входные данные к bigint
  const e0 = typeof message === "bigint" ? message : hexToBigInt(message);
  const privateKey = hexToBigInt(privateKeyHex);
  let e = (e0 % this.q + this.q) % this.q;
  if (e === ZERO) e = ONE;

  // Если передан k
  let kk: bigint;
  if (kHex && strip0x(kHex).length > 0) {
    kk = (hexToBigInt(kHex) % this.q + this.q) % this.q;
  } else {
    kk = randBetween(this.q);
  }

  // 2) Алгоритм
  let r = ZERO, s = ZERO;
  while (r === ZERO || s === ZERO) {
    const C = this.pPoint.mul(kk);
    r = (C.x! % this.q + this.q) % this.q;
    s = (r * privateKey + kk * e) % this.q;
    if (r === ZERO || s === ZERO) {
      kk = randBetween(this.q); // генерируем новый
    }
  }

  // 3) Возвращаем как hex-строки
  return {
    r: toHex(r),
    s: toHex(s)
  };
}

  // verify
verifyHex(
  message: string | bigint,
  rHex: string,
  sHex: string,
  publicKeyHex: string
): boolean {
  const e0 = typeof message === "bigint" ? message : hexToBigInt(message);
  const r  = hexToBigInt(rHex);
  const s  = hexToBigInt(sHex);

  // Отвергаем заведомо некорректные подписи
  if (r <= 0n || r >= this.q || s <= 0n || s >= this.q) return false;

  let e = mod(e0, this.q);
  if (e === 0n) e = 1n;

  const pk = strip0x(publicKeyHex);
  const coordDigits = this.p.toString(16).length;

  // Требуем ровно 2*coordDigits шестнадц. символов
  if (pk.length !== 2 * coordDigits) {
    // если прислали без паддинга — это ошибка формата
    return false;
  }
  const xHex = pk.slice(0, coordDigits);
  const yHex = pk.slice(coordDigits);

  const Q = new ECPoint(
    hexToBigInt(xHex),
    hexToBigInt(yHex),
    this.a, this.b, this.p
  );

  const nu = modInv(e, this.q);
  const z1 = mod(s * nu, this.q);
  const z2 = mod(-r * nu, this.q);

  const C = this.pPoint.mul(z1).add(Q.mul(z2));
  if (C.isInfinity()) return false;

  return mod(C.x!, this.q) === r;
}
}

// ---------- пример использования (точно такой же набор параметров) ----------
export function generateGostKeyPair() {
  const p  = 115792089237316195423570985008687907853269984665640564039457584007913129639319n;
  const a  = 115792089237316195423570985008687907853269984665640564039457584007913129639316n;
  const b  = 166n;
  const xG = 1n;
  const yG = 64033881142927202683649881450433473985931760268884941288852745803908878638612n;
  const q  = 115792089237316195423570985008687907853073762908499243225378155805079068850323n;

  const gost = new DSGOST(p, a, b, q, xG, yG);
  const { d, Q } = gost.genKeys();

  // helper для приведения BigInt → hex
  const toHex = (bn: bigint) => bn.toString(16);
  const publicKeyHex = toHex(Q.x!) + toHex(Q.y!);
  return {
    privateKey: toHex(d),
    publicKey: publicKeyHex,
    p: toHex(p),
    a: toHex(a),
    b: toHex(b),
    q: toHex(q),
    xp: toHex(xG),
    yp: toHex(yG),
    Q: publicKeyHex,
    Qx: toHex(Q.x!),
    Qy: toHex(Q.y!)
  };
}