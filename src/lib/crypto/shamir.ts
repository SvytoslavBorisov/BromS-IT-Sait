// src/lib/crypto/shamir_vss.ts
// Полный порт библиотеки shamir_vss.py на TypeScript (ES2020+)

/**
 * Быстрое возведение в степень по модулю: (base^exponent) % modulus
 */
export function modPow(
  base: bigint,
  exponent: bigint,
  modulus: bigint
): bigint {
  if (modulus === 1n) return 0n;
  let result = 1n;
  base %= modulus;
  while (exponent > 0n) {
    if (exponent & 1n) result = (result * base) % modulus;
    exponent >>= 1n;
    base = (base * base) % modulus;
  }
  return result;
}

/**
 * Расширенный алгоритм Евклида для обратного по модулю: a^{-1} mod m
 */
export function modInverse(
  a: bigint,
  m: bigint
): bigint {
  let [old_r, r] = [(a % m + m) % m, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  if (old_r !== 1n) throw new Error('Нет обратного по модулю');
  return (old_s % m + m) % m;
}

/**
 * Генерация случайного BigInt в диапазоне [0, n)
 */
export function randBetween(n: bigint): bigint {
  const bits = n.toString(2).length;
  const bytes = Math.ceil(bits / 8);
  let rnd: bigint;
  do {
    const buf = typeof window !== 'undefined'
      ? crypto.getRandomValues(new Uint8Array(bytes))
      : require('crypto').randomBytes(bytes);
    const hex = [...(buf as Uint8Array)].
      map(b => b.toString(16).padStart(2, '0')).
      join('');
    rnd = BigInt('0x' + hex);
  } while (rnd >= n);
  return rnd;
}

/**
 * Тест Миллера–Рабина для проверки простоты
 */
export function isPrime(
  n: bigint,
  k = 40
): boolean {
  if (n < 2n || (n & 1n) === 0n) return n === 2n;
  let d = n - 1n;
  let s = 0;
  while ((d & 1n) === 0n) { d >>= 1n; s++; }
  for (let i = 0; i < k; i++) {
    const a = randBetween(n - 3n) + 2n;
    let x = modPow(a, d, n);
    if (x === 1n || x === n - 1n) continue;
    let composite = true;
    for (let r = 0; r < s - 1; r++) {
      x = modPow(x, 2n, n);
      if (x === n - 1n) { composite = false; break; }
    }
    if (composite) return false;
  }
  return true;
}

/**
 * Генерация случайного простого числа заданной битовой длины
 */
export function genPrime(bits: number): bigint {
  if (bits < 2) throw new Error('bits must be >= 2');
  while (true) {
    const p = (randBetween(1n << BigInt(bits - 1)) | (1n << BigInt(bits - 1))) | 1n;
    if (isPrime(p)) return p;
  }
}

/**
 * Генерация безопасного простого p = 2q + 1
 */
export function genSafePrime(
  bits: number
): { p: bigint; q: bigint } {
  if (bits < 3) throw new Error('bits must be >= 3');
  while (true) {
    const q = genPrime(bits - 1);
    const p = 2n * q + 1n;
    if (isPrime(p)) return { p, q };
  }
}

/**
 * Поиск генератора подгруппы
 */
export function findGenerator(
  p: bigint,
  factors: bigint[]
): bigint {
  while (true) {
    const g = randBetween(p - 3n) + 2n;
    if (factors.every(f => modPow(g, (p - 1n) / f, p) !== 1n)) {
      return g;
    }
  }
}

// -----------------------------------------------------------------------------
// SHAMIR SECRET SHARING
// -----------------------------------------------------------------------------

/**
 * Деление секрета по схеме Шамира
 */
export function shareSecret(
  secret: Uint8Array | bigint,
  threshold: number,
  shares: number,
  prime?: bigint,
  bits = 0
): { prime: bigint; points: [bigint, bigint][] } {
  const secretInt = typeof secret === 'bigint'
    ? secret
    : BigInt('0x' + Buffer.from(secret).toString('hex'));
  if (threshold < 1 || shares < threshold) {
    throw new Error('shares >= threshold >= 1');
  }
  let _prime = prime;
  if (!_prime) {
    const need = Math.max(
      secretInt.toString(2).length + 1,
      Math.ceil(Math.log2(shares + 1))
    );
    bits = Math.max(bits, need);
    _prime = genPrime(bits);
  } else if (_prime <= secretInt || _prime <= BigInt(shares) || !isPrime(_prime)) {
    throw new Error('prime must be > secret, > shares and prime');
  }
  const coeffs: bigint[] = [secretInt];
  for (let i = 1; i < threshold; i++) {
    coeffs.push(randBetween(_prime!));
  }
  const points: [bigint, bigint][] = [];
  for (let i = 1; i <= shares; i++) {
    const x = BigInt(i);
    let y = 0n;
    coeffs.forEach((c, exp) => {
      y = (y + c * modPow(x, BigInt(exp), _prime!)) % _prime!;
    });
    points.push([x, y]);
  }
  return { prime: _prime!, points };
}

/**
 * Восстановление секрета по схеме Шамира
 */
export function reconstructSecret(
  sharesArr: [bigint, bigint][],
  prime: bigint
): Uint8Array {
  if (!sharesArr.length) throw new Error('Need at least one share');
  let secretInt = 0n;
  sharesArr.forEach(([i, yi]) => {
    let num = 1n;
    let den = 1n;
    sharesArr.forEach(([j]) => {
      if (j !== i) {
        num = (num * -j) % prime;
        den = (den * (i - j)) % prime;
      }
    });
    const li = (num * modInverse(den, prime)) % prime;
    secretInt = (secretInt + yi * li) % prime;
  });
  const hex = secretInt.toString(16).padStart(2, '0');
  const buf = Buffer.from(hex.length % 2 ? '0' + hex : hex, 'hex');
  return new Uint8Array(buf);
}

// -----------------------------------------------------------------------------
// FELDMAN VSS
// -----------------------------------------------------------------------------

/**
 * Деление секрета с проверяемыми долями (Feldman VSS)
 */
export function shareSecretVSS(
  secret: Uint8Array | bigint,
  threshold: number,
  shares: number,
  bits = 0,
  p?: bigint,
  q?: bigint
): {
  p: bigint;
  q: bigint;
  g: bigint;
  commitments: bigint[];
  sharesList: [bigint, bigint][];
} {
  const secretInt = typeof secret === 'bigint'
    ? secret
    : BigInt('0x' + Buffer.from(secret).toString('hex')); 
  if (threshold < 1 || shares < threshold) {
    throw new Error('shares >= threshold >= 1');
  }
  let _p = p;
  let _q = q;
  if (!_p || !_q) {
    const safe = genSafePrime(bits || secretInt.toString(2).length + 1);
    _p = safe.p;
    _q = safe.q;
  } else if (_p !== 2n * _q + 1n || !isPrime(_p) || !isPrime(_q)) {
    throw new Error('Invalid p or q');
  }
  const coeffs: bigint[] = [secretInt];
  for (let i = 1; i < threshold; i++) {
    coeffs.push(randBetween(_q!));
  }
  const h = findGenerator(_p!, [2n, _q!]);
  const g = modPow(h, 2n, _p!);
  const commitments = coeffs.map(a => modPow(g, a, _p!));
  const sharesList: [bigint, bigint][] = [];
  for (let i = 1; i <= shares; i++) {
    const x = BigInt(i);
    let y = 0n;
    coeffs.forEach((c, exp) => {
      y = (y + c * modPow(x, BigInt(exp), _q!)) % _q!;
    });
    sharesList.push([x, y]);
  }
  return { p: _p!, q: _q!, g, commitments, sharesList };
}

/**
 * Проверка одной доли Feldman VSS
 */
export function verifyShare(
  share: [bigint, bigint],
  p: bigint,
  g: bigint,
  commitments: bigint[]
): boolean {
  const [x, y] = share;
  let lhs = modPow(g, y, p);
  let rhs = 1n;
  commitments.forEach((Cj, j) => {
    rhs = (rhs * modPow(Cj, modPow(x, BigInt(j), p), p)) % p;
  });
  return lhs === rhs;
}

/**
 * Восстановление секрета из Feldman VSS
 */
export function reconstructSecretVSS(
  sharesArr: [bigint, bigint][],
  q: bigint
): bigint {
  if (!sharesArr.length) throw new Error('Need at least one share');
  let secret = 0n;
  sharesArr.forEach(([xi, yi]) => {
    let num = 1n;
    let den = 1n;
    sharesArr.forEach(([xj]) => {
      if (xj !== xi) {
        num = (num * -xj) % q;
        den = (den * (xi - xj)) % q;
      }
    });
    const li = (num * modInverse(den, q)) % q;
    secret = (secret + yi * li) % q;
  });
  return secret;
}

/**
 * Протокол Shamir без дилера (Ingemarsson–Simmons)
 */
export function setupNoDealer(
  ids: number[],
  threshold: number,
  prime?: bigint,
  bits = 0
): { prime: bigint; shares: [bigint, bigint][] } {
  const n = ids.length;
  if (threshold < 1 || threshold > n) {
    throw new Error('threshold must satisfy 1 ≤ threshold ≤ n');
  }

  let _prime = prime;
  if (!_prime) {
    _prime = shareSecret(0n, threshold, n, undefined, bits).prime;
  }

  // Сохраняем у каждого участника массив его точек
  const participants = new Map<number, [bigint, bigint][]>();
  for (const id of ids) {
    const secret_i = randBetween(_prime);
    const { points } = shareSecret(secret_i, threshold, n, _prime, bits);
    participants.set(id, points);
  }

  // Аггрегируем доли по каждому j
  const shares: [bigint, bigint][] = ids.map(j => {
    const Bj = BigInt(j);
    const sum = ids.reduce((acc, i) => {
      const pts = participants.get(i)!;
      const tup = pts.find(p => p[0] === Bj)!;
      return (acc + tup[1]) % _prime!;
    }, 0n);
    return [Bj, sum];
  });

  return { prime: _prime, shares };
}