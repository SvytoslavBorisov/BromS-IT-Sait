import BN from 'bn.js';

interface Point { x: BN; y: BN; }

// Параметры кривой y² = x³ + a·x + b mod p
const p  = new BN('8000000000000000000000000000000000000000000000000000000000000431', 16);  // ваш p
const a  = new BN('7', 16);  // ваш a
const b  = new BN('5FBFF498AA938CE739B8E022FBAFEF40563F6E6A3472FC2A514C0CE9DAE23B7E', 16);  // ваш b
export const G: Point = {
  x: new BN('2', 16),        // координаты базовой точки
  y: new BN('8E2A8A0E65147D4BD6316030E16D19C85C97F0A9CA267122B96ABBCEA7E8FC8', 16),
};

/** Модульное обратное: a⁻¹ mod p */
function inv(a: BN): BN {
  return a.invm(p);
}

/** Сложение точек P+Q на непустой кривой (не обрабатывает вырожденный случай O) */
function pointAdd(P: Point, Q: Point): Point {
  if (P.x.eq(Q.x) && P.y.eq(Q.y)) {
    // если P == Q, делегируем на doubling
    return pointDouble(P);
  }
  const λ = Q.y.sub(P.y).mul(Q.x.sub(P.x).invm(p)).mod(p);
  const x3 = λ.pow(new BN(2)).sub(P.x).sub(Q.x).mod(p);
  const y3 = λ.mul(P.x.sub(x3)).sub(P.y).mod(p);
  return { x: x3, y: y3 };
}

/** Удвоение точки P на кривой */
function pointDouble(P: Point): Point {
  // λ = (3·x1² + a) / (2·y1)
  const num = P.x.pow(new BN(2)).mul(new BN(3)).add(a).mod(p);
  const den = P.y.mul(new BN(2)).invm(p);
  const λ = num.mul(den).mod(p);

  const x3 = λ.pow(new BN(2)).sub(P.x.mul(new BN(2))).mod(p);
  const y3 = λ.mul(P.x.sub(x3)).sub(P.y).mod(p);
  return { x: x3, y: y3 };
}

/** Умножение точки P на скаляр k (double-and-add) */
export function scalarMul(k: BN, P: Point): Point {
  let R: Point | null = null;  // R = O
  let Q = P;

  for (let i = k.bitLength() - 1; i >= 0; i--) {
    if (R) {
      R = pointDouble(R);
    }
    if (k.testn(i)) {
      R = R ? pointAdd(R, Q) : Q;
    }
  }

  // к нулю скаляр в BN преобразует в null, возвращаем O как (0,0) или как хотите
  if (!R) throw new Error('Result is point at infinity');
  return R;
}

// Пример: C = k·G
const k = new BN('1234ABCD', 16);
const C = scalarMul(k, G);
console.log('C.x =', C.x.toString(16));
console.log('C.y =', C.y.toString(16));
