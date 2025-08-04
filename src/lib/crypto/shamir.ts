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
  if (sharesArr.length === 0) {
    throw new Error("Need at least one share");
  }

  // Lagrange interpolation at 0: secret = Σ_{i} y_i * l_i(0) mod prime
  let secretInt = 0n;

  for (const [xi, yi] of sharesArr) {
    // numerator = ∏_{j ≠ i} (0 - xj) = ∏( -xj )
    let num = 1n;
    // denominator = ∏_{j ≠ i} (xi - xj)
    let den = 1n;

    for (const [xj] of sharesArr) {
      if (xj === xi) continue;
      num = (num * (prime - xj)) % prime;     // (0 - xj) mod prime
      den = (den * (xi - xj)) % prime;
    }

    const invDen = modInverse(den, prime);
    const li     = (num * invDen) % prime;
    secretInt    = (secretInt + yi * li) % prime;
  }

  // Convert secretInt to hex string
  let hex = secretInt.toString(16);
  if (hex.length % 2 === 1) {
    hex = "0" + hex;
  }

  // Buffer.from works in Node; in browser you can polyfill or use:
  const buf = Buffer.from(hex, "hex");
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
    if (threshold < 1 || shares < threshold) {
    throw new Error('shares >= threshold >= 1');
  }

  // 1) Преобразуем secret в bigint
  let secretInt = typeof secret === 'bigint'
    ? secret
    : BigInt('0x' + Buffer.from(secret).toString('hex'));

  // 2) Генерируем (или проверяем) безопасные простые p, q
  let _p = p;
  let _q = q;
  if (!_p || !_q) {
    // ←– Здесь вместо простого genSafePrime(bits) делаем так:
    const n_bits = secretInt.toString(2).length;
    // +8 бит запаса, чтобы q > секрет
    const safe = genSafePrime(n_bits + 8);
    _p = safe.p;
    _q = safe.q;
  } else {
    if (_p !== 2n * _q + 1n || !isPrime(_p) || !isPrime(_q)) {
      throw new Error('Invalid p or q');
    }
  }

  // 3) Сводим секрет в Z_q (теперь q гарантированно > secretInt)
  secretInt %= _q;

  // 4) Строим случайный полином степени (threshold-1) в поле mod q
  const coeffs: bigint[] = [secretInt];
  for (let i = 1; i < threshold; i++) {
    coeffs.push(randBetween(_q!));
  }

  // 5) Находим генератор группы порядка q
  const h = findGenerator(_p!, [2n, _q!]);
  const g = modPow(h, 2n, _p!);

  // 6) Вычисляем обязательства C_j = g^{a_j} mod p
  const commitments = coeffs.map(a => modPow(g, a, _p!));

  // 7) Генерируем sharesList: (x, y=f(x) mod q)
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
  commitments: bigint[],
  q: bigint
): boolean {
  const [x, y] = share;
  const lhs = modPow(g, y, p);
  console.log("verifyShare — x =", x, "y =", y);
  console.log("lhs = g^y mod p =", lhs);

  let rhs = 1n;
  commitments.forEach((Cj, j) => {
    const exp = modPow(x, BigInt(j), q);
    const term = modPow(Cj, exp, p);
    console.log(`  C[${j}] = ${Cj}, x^${j} mod q = ${exp}, term = ${term}`);
    rhs = (rhs * term) % p;
  });
  console.log("rhs =", rhs);

  return lhs === rhs;
}


/**
 * Восстановление секрета из Feldman VSS (Лагранж)
 */
export function reconstructSecretVSS(
  sharesArr: [bigint, bigint][],
  q: bigint
): bigint {
  if (sharesArr.length === 0) {
    throw new Error('Need at least one share');
  }

  let secret = 0n;
  for (const [xi, yi] of sharesArr) {
    let num = 1n;
    let den = 1n;
    for (const [xj] of sharesArr) {
      if (xj !== xi) {
        num = (num * -xj) % q;
        den = (den * (xi - xj)) % q;
      }
    }
    const li = (num * modInverse(den, q)) % q;
    secret = (secret + yi * li) % q;
  }
  console.log('secret', secret,);
  // приводим к положительному представлению
  return (secret + q) % q;
}