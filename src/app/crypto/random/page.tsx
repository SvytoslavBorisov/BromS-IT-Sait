'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Генератор «настоящего» случайного числа: OS CSPRNG + энтропия пользователя,
 * экстракция через SHA-256-DRBG. Без сторонних библиотек.
 */

/* ========================== УТИЛИТЫ (TS-БЕЗОПАСНЫЕ) ========================== */

/** Гарантируем, что на вход WebCrypto попадёт именно ArrayBuffer (а не SharedArrayBuffer). */
function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  // Если view покрывает весь буфер и буфер — ArrayBuffer, можно отдать без копии
  if (
    u8.byteOffset === 0 &&
    u8.byteLength === u8.buffer.byteLength &&
    typeof ArrayBuffer !== 'undefined' &&
    u8.buffer instanceof ArrayBuffer
  ) {
    return u8.buffer as ArrayBuffer;
  }
  // Иначе делаем копию в новый Uint8Array -> у него гарантированно ArrayBuffer
  const copy = u8.slice();
  return copy.buffer;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const ab = toArrayBuffer(bytes);
  const digest = await crypto.subtle.digest('SHA-256', ab);
  return new Uint8Array(digest);
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  const v = new DataView(b.buffer);
  v.setUint32(0, n >>> 0, false);
  return b;
}

function f64(n: number): Uint8Array {
  const b = new Uint8Array(8);
  const v = new DataView(b.buffer);
  v.setFloat64(0, n, false);
  return b;
}

function textBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function toHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let n = 0n;
  for (let i = 0; i < bytes.length; i++) n = (n << 8n) + BigInt(bytes[i]);
  return n;
}

function bigIntToDecimal(n: bigint): string {
  return n.toString(10);
}

/**
 * DRBG на SHA-256:
 *   K = SHA256(pool || randomOS || timestamp)
 *   out = SHA256(K || counter) блоками до нужной длины
 */
async function deriveRandomBytes(pool: Uint8Array, byteLen: number): Promise<Uint8Array> {
  const osRand = new Uint8Array(byteLen);
  crypto.getRandomValues(osRand);
  const seedMaterial = concatBytes(pool, osRand, f64(performance.now()));
  const K = await sha256(seedMaterial);

  const out = new Uint8Array(byteLen);
  let offset = 0;
  let counter = 0;
  while (offset < byteLen) {
    const block = await sha256(concatBytes(K, u32(counter++)));
    const take = Math.min(block.length, byteLen - offset);
    out.set(block.subarray(0, take), offset);
    offset += take;
  }
  return out;
}

/* =============================== UI ХЕЛПЕРЫ =============================== */

function CopyButton({ value, label }: { value: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        } catch {
          setOk(false);
        }
      }}
      className="px-3 py-1.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      title="Скопировать"
      type="button"
    >
      {ok ? 'Скопировано' : label}
    </button>
  );
}

/* ============================== КОМПОНЕНТ СТРАНИЦЫ ============================== */

export default function RandomTruePage() {
  const [pool, setPool] = useState<Uint8Array>(new Uint8Array(32));
  const [entropyBits, setEntropyBits] = useState<number>(0);
  const [bitLen, setBitLen] = useState<number>(256);
  const [hexOut, setHexOut] = useState<string>('');
  const [decOut, setDecOut] = useState<string>('');
  const [busy, setBusy] = useState(false);

  // Микрофон
  const [micEnabled, setMicEnabled] = useState(false);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micRAF = useRef<number | null>(null);

  // Инициализация стартового пула
  useEffect(() => {
    (async () => {
      const boot = new Uint8Array(64);
      const rnd = new Uint8Array(32);
      crypto.getRandomValues(boot);
      crypto.getRandomValues(rnd);

      const sys = concatBytes(
        textBytes(navigator.userAgent),
        u32(screen.width),
        u32(screen.height),
        f64(performance.timeOrigin),
        f64(performance.now()),
        boot,
        rnd
      );
      const seed = await sha256(sys);
      setPool(seed);
      setEntropyBits(64); // консервативная стартовая оценка
    })();
  }, []);

  // Добавление энтропии: pool = SHA256(pool || sample)
  const mix = useCallback(
    async (sample: Uint8Array, addBits: number) => {
      const next = await sha256(concatBytes(pool, sample));
      setPool(next);
      setEntropyBits((prev) => Math.min(prev + addBits, 4096));
    },
    [pool]
  );

  // Джиттер мыши
  useEffect(() => {
    let last = performance.now();
    const onMove = async (e: MouseEvent) => {
      const now = performance.now();
      const dt = now - last;
      last = now;

      const data = concatBytes(u32(e.screenX >>> 0), u32(e.screenY >>> 0), f64(now), f64(dt));
      await mix(data, 2);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [mix]);

  // Тайминги клавиатуры
  useEffect(() => {
    let last = performance.now();
    const onKey = async (e: KeyboardEvent) => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      const data = concatBytes(textBytes(e.key), f64(now), f64(dt));
      await mix(data, 2);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mix]);

  // Микрофон: старт/стоп шума
  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const Ctx: typeof AudioContext =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new Ctx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      micAnalyserRef.current = analyser;
      setMicEnabled(true);

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const loop = async () => {
        if (!micAnalyserRef.current) return;
        analyser.getByteTimeDomainData(buf);
        const h = await sha256(buf);
        await mix(h, 8);
        micRAF.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setMicEnabled(false);
    }
  }, [mix]);

  const stopMic = useCallback(() => {
    if (micRAF.current) cancelAnimationFrame(micRAF.current);
    micRAF.current = null;
    micAnalyserRef.current = null;
    setMicEnabled(false);
  }, []);

  // Генерация числа
  const generate = useCallback(async () => {
    setBusy(true);
    try {
      const byteLen = Math.ceil(bitLen / 8);
      const bytes = await deriveRandomBytes(pool, byteLen);

      // Обрезаем до точного числа бит
      const excess = byteLen * 8 - bitLen;
      if (excess > 0) {
        const firstMask = 0xff >>> excess;
        bytes[0] &= firstMask;
      }

      const hex = toHex(bytes);
      const dec = bigIntToDecimal(bytesToBigInt(bytes));

      setHexOut(hex);
      setDecOut(dec);

      // Self-healing пула
      const post = await sha256(concatBytes(pool, bytes, f64(performance.now())));
      setPool(post);
      setEntropyBits((b) => Math.max(0, b - Math.ceil(bitLen * 0.25)));
    } finally {
      setBusy(false);
    }
  }, [bitLen, pool]);

  const entropyBar = useMemo(() => {
    const pct = Math.max(0, Math.min(100, Math.round((entropyBits / 256) * 100)));
    return pct;
  }, [entropyBits]);

  /* ============================== РЕНДЕР ============================== */

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100 px-4 py-10 flex justify-center">
      <article className="w-full max-w-3xl bg-white/80 dark:bg-gray-950/80 backdrop-blur rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-800 p-6 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Генератор «настоящего» случайного числа
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Смешиваем CSPRNG ОС с энтропией пользователя (мышь, клавиатура, микрофон) и извлекаем
            результат через SHA-256-DRBG.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800">
              Web Crypto API
            </span>
            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800">
              SHA-256
            </span>
            <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800">
              DRBG
            </span>
          </div>
        </header>

        {/* Энтропия */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Оценка накопленной энтропии</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">~{entropyBits} бит</span>
          </div>
          <div className="w-full h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-3 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all"
              style={{ width: `${entropyBar}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Двигай мышью, нажимай клавиши или включи микрофон для ускоренного набора энтропии.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!micEnabled ? (
              <button
                onClick={startMic}
                className="px-3 py-2 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 transition"
                type="button"
              >
                Включить микрофон (добавлять шум)
              </button>
            ) : (
              <button
                onClick={stopMic}
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                type="button"
              >
                Выключить микрофон
              </button>
            )}
          </div>
        </section>

        {/* Настройки */}
        <section className="mb-6">
          <label className="block text-sm font-medium mb-1">Длина числа (в битах)</label>
          <div className="flex flex-wrap items-center gap-2">
            {[128, 192, 224, 256, 320, 384, 512, 768, 1024].map((b) => (
              <button
                key={b}
                onClick={() => setBitLen(b)}
                className={`px-3 py-1.5 rounded-xl border text-sm transition ${
                  bitLen === b
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                type="button"
              >
                {b}
              </button>
            ))}
          </div>
        </section>

        {/* Действие */}
        <section className="mb-8">
          <button
            onClick={generate}
            disabled={busy}
            className="w-full md:w-auto px-5 py-3 rounded-2xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 transition"
            type="button"
          >
            {busy ? 'Генерация…' : 'Сгенерировать число'}
          </button>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            Для устойчивости дождись ~256 бит энтропии (полная полоса).
          </p>
        </section>

        {/* Результаты */}
        <section className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold">HEX</h2>
              {hexOut && <CopyButton value={hexOut} label="Копировать HEX" />}
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-3 overflow-x-auto text-sm font-mono">
              {hexOut || '— результата пока нет —'}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold">DEC</h2>
              {decOut && <CopyButton value={decOut} label="Копировать DEC" />}
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-3 overflow-x-auto text-sm font-mono">
              {decOut || '— результата пока нет —'}
            </div>
          </div>

          <details className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <summary className="cursor-pointer font-medium">Как это работает (кратко)</summary>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li>Начальный пул = SHA-256(данные об окружении + CSPRNG ОС).</li>
              <li>События мыши/клавиатуры и микрофон хэшируются и смешиваются в пул.</li>
              <li>DRBG: K = SHA-256(pool || OS-random || timestamp), выход — блоками SHA-256(K||ctr).</li>
              <li>Выход обрезается до N бит, после чего снова перемешивается в пул (self-healing).</li>
            </ul>
          </details>
        </section>
      </article>
    </main>
  );
}
