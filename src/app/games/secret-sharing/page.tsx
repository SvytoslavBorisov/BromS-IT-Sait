"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Scatter,
  ScatterChart,
  ZAxis,
  Legend,
  ReferenceLine,
} from "recharts";

/**
 * Secret Sharing Lab — красивая интерактивная визуализация пороговой схемы Шамира
 * Страница для Next.js App Router: app/games/secret-sharing/page.tsx
 * UI: TailwindCSS + Framer Motion + Recharts
 *
 * Игровой поток:
 *  - Пользователь вводит секрет (число 0..65535 — идеально; текст будет захеширован в число для демонстрации)
 *  - Выбирает параметры (k, n)
 *  - Нажимает «Раздать доли» → генерируется полином степени k-1 в поле mod P и n точек (x=1..n)
 *  - Выбирает любые k участников — секрет автоматически восстанавливается в x=0 через интерполяцию Лагранжа
 *
 * Обучение: показывает принцип «k из n», бесполезность <k долей и визуально — одну кривую (полином),
 * проходящую через доли. Это образовательная демо‑игра (не для боевого применения).
 */

// Поле: берём небольшой простой модуль, безопасный для числовой арифметики JS
const P = 65537; // 2^16 + 1 (простое Ферма)

// ---------- Математика по модулю ----------
const mod = (a: number) => ((a % P) + P) % P;
const add = (a: number, b: number) => mod(a + b);
const sub = (a: number, b: number) => mod(a - b);
const mul = (a: number, b: number) => mod(a * b);

function egcd(a: number, b: number): [number, number, number] {
  // Возвращает [g, x, y] такие, что ax + by = g = gcd(a,b)
  let x0 = 1, y0 = 0, x1 = 0, y1 = 1;
  while (b !== 0) {
    const q = Math.floor(a / b);
    [a, b] = [b, a - q * b];
    [x0, x1] = [x1, x0 - q * x1];
    [y0, y1] = [y1, y0 - q * y1];
  }
  return [a, x0, y0];
}

function inv(a: number): number {
  a = mod(a);
  if (a === 0) throw new Error("Нет обратного: деление на 0");
  const [g, x] = egcd(a, P);
  if (g !== 1 && g !== -1) throw new Error("Элемент не обратим по модулю P");
  return mod(x);
}

function polyEval(coeffs: number[], x: number): number {
  // coeffs: [a0, a1, a2, ...] — a0 + a1*x + a2*x^2 + ... (mod P)
  let y = 0;
  let pow = 1;
  for (let i = 0; i < coeffs.length; i++) {
    y = add(y, mul(coeffs[i], pow));
    pow = mul(pow, x);
  }
  return y;
}

function lagrangeInterpolateAt0(shares: Array<{ x: number; y: number }>): number {
  // Восстановление значения полинома в x=0 по долям (xi, yi)
  // f(0) = Σ yi * Π_{j!=i} ((0 - xj)/(xi - xj)) (mod P)
  if (shares.length === 0) return 0;
  let acc = 0;
  for (let i = 0; i < shares.length; i++) {
    const xi = shares[i].x;
    const yi = shares[i].y;
    let li = 1;
    for (let j = 0; j < shares.length; j++) {
      if (i === j) continue;
      const xj = shares[j].x;
      const num = sub(0, xj); // (0 - xj)
      const den = sub(xi, xj);
      li = mul(li, mul(num, inv(den)));
    }
    acc = add(acc, mul(yi, li));
  }
  return acc;
}

// ---------- Типы ----------
interface Share {
  id: number; // 1..n
  x: number; // 1..n
  y: number; // 0..P-1
  selected: boolean;
}

// Хеш/кодирование строки в число (демо). Для полноты — обратимость не гарантируется.
function demoEncodeToField(input: string): { value: number; note?: string } {
  const trimmed = (input ?? "").trim();
  if (trimmed === "") return { value: 0 };
  if (/^\d+$/.test(trimmed)) {
    const v = Number(trimmed) % P;
    return { value: v, note: `секрет = ${v} (число mod ${P})` };
  }
  // Простая DJB2‑подобная свёртка, затем mod P — образовательная демо‑функция
  let h = 5381;
  for (let i = 0; i < trimmed.length; i++) h = ((h << 5) + h + trimmed.charCodeAt(i)) | 0;
  const v = mod(Math.abs(h));
  return { value: v, note: `текст → демо‑код = ${v} (mod ${P})` };
}

// Генерация коэффициентов полинома: a0=secret, a1..a_{k-1}=random
function genPoly(secret: number, k: number): number[] {
  const coeffs = [mod(secret)];
  for (let i = 1; i < k; i++) {
    coeffs.push(Math.floor(Math.random() * P));
  }
  return coeffs;
}

function genShares(coeffs: number[], n: number): Share[] {
  const shares: Share[] = [];
  for (let x = 1; x <= n; x++) {
    shares.push({ id: x, x, y: polyEval(coeffs, x), selected: false });
  }
  return shares;
}

export default function SecretSharingLabPage() {
  // ---------- Управление формой ----------
  const [secretInput, setSecretInput] = useState<string>("1234");
  const [k, setK] = useState<number>(3);
  const [n, setN] = useState<number>(7);
  const [seed, setSeed] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setSeed(Math.floor(Math.random() * 1e9));
  }, []);

  // ---------- Внутреннее состояние схемы ----------
  const { secretValue, note } = useMemo(() => {
    const enc = demoEncodeToField(secretInput);
    return { secretValue: enc.value, note: enc.note };
  }, [secretInput]);

  const [coeffs, setCoeffs] = useState<number[]>(() => Array.from({ length: k }, (_, i) => (i === 0 ? mod(secretValue) : 0)));
  const [shares, setShares] = useState<Share[]>(() => genShares(coeffs, n));

  // Реген при изменении параметров
  useEffect(() => {
    setCoeffs(genPoly(secretValue, k));
  }, [k, seed, secretValue]);

  useEffect(() => {
    setShares(genShares(coeffs, n));
  }, [coeffs, n]);

  // Выбранные доли
  const selected = useMemo(() => shares.filter((s) => s.selected), [shares]);
  const canRecover = selected.length >= k;
  const recovered = useMemo(() => (canRecover ? lagrangeInterpolateAt0(selected) : null), [selected, canRecover]);
  const success = recovered !== null && mod(recovered!) === mod(secretValue);

  // Красивая полилиния полинома для графика
  const chartData = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = [];
    const maxX = Math.max(n + 1, 8);
    const step = 0.15;
    for (let x = 0; x <= maxX; x += step) {
      pts.push({ x, y: polyEval(coeffs, x) });
    }
    return pts;
  }, [coeffs, n]);

  // ---------- Хэндлеры ----------
  const dealShares = () => setSeed((s) => s + 1);
  const toggleShare = (id: number) =>
    setShares((arr) => arr.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)));
  const resetSelection = () => setShares((arr) => arr.map((s) => ({ ...s, selected: false })));
  const pickRandomK = () => {
    const ids = shares.map((s) => s.id);
    ids.sort(() => Math.random() - 0.5);
    const sel = new Set(ids.slice(0, Math.min(k, ids.length)));
    setShares((arr) => arr.map((s) => ({ ...s, selected: sel.has(s.id) })));
  };

  const copyShares = async () => {
    const payload = shares.map((s) => ({ x: s.x, y: s.y }));
    try {
      await navigator.clipboard.writeText(JSON.stringify({ P, k, n, shares: payload }, null, 2));
      alert("Доли скопированы в буфер обмена");
    } catch {
      alert("Не удалось скопировать");
    }
  };

  // ---------- Валидация формы ----------
  const kMax = Math.min(8, n); // ограничим степень для стабильного рендера
  const kSafe = Math.min(Math.max(2, k), kMax);
  useEffect(() => {
    if (k !== kSafe) setK(kSafe);
  }, [k, kSafe]);

  // ---------- UI ----------
  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">🔐 Secret Sharing Lab</h1>
            <p className="text-slate-300">Интерактивная пороговая схема Шамира — выбери любые k долей и восстанови секрет.</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl px-4 py-2 text-sm font-medium shadow ring-1 ring-white/10 ${
              success ? "bg-emerald-500/15 text-emerald-200" : canRecover ? "bg-amber-500/15 text-amber-200" : "bg-slate-700/40 text-slate-200"
            }`}
          >
            {success ? "Секрет восстановлен верно!" : canRecover ? "Можно восстановить секрет (выбрано ≥ k)" : "Выбери ≥ k долей"}
          </motion.div>
        </div>

        {/* Панель параметров */}
        <div className="mb-6 grid gap-4 rounded-2xl bg-slate-800/60 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur md:grid-cols-3">
          {/* Секрет */}
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">Секрет</label>
            <input
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder="число 0..65535 или текст (будет сведения)"
              className="w-full rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 outline-none ring-indigo-400/0 focus:ring-2"
            />
            {note && <p className="text-xs text-slate-400">{note}</p>}
          </div>

          {/* k */}
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">k — порог восстановления</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={2}
                max={kMax}
                value={k}
                onChange={(e) => setK(Number(e.target.value))}
                className="flex-1"
              />
              <div className="w-10 text-center text-lg font-semibold">{k}</div>
            </div>
            <p className="text-xs text-slate-400">Степень полинома = k − 1. Ограничено ≤ {kMax} для стабильной визуализации.</p>
          </div>

          {/* n */}
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">n — число участников</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={k}
                max={12}
                value={n}
                onChange={(e) => setN(Number(e.target.value))}
                className="flex-1"
              />
              <div className="w-10 text-center text-lg font-semibold">{n}</div>
            </div>
            <p className="text-xs text-slate-400">Участники получают точки (x=1..n).</p>
          </div>

          <div className="md:col-span-3 flex flex-wrap gap-2 pt-2">
            <button onClick={dealShares} className="rounded-xl bg-indigo-500 px-4 py-2 text-white shadow hover:bg-indigo-400">Раздать доли заново</button>
            <button onClick={pickRandomK} className="rounded-xl bg-emerald-600 px-4 py-2 text-white shadow hover:bg-emerald-500">Выбрать случайные k</button>
            <button onClick={resetSelection} className="rounded-xl bg-slate-600 px-4 py-2 text-white shadow hover:bg-slate-500">Снять выбор</button>
            <button onClick={copyShares} className="rounded-xl border border-white/15 px-4 py-2 text-slate-100 hover:bg-white/10">Скопировать доли</button>
          </div>
        </div>

        {/* Основной блок: график + список карточек участников */}
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          {/* График */}
          <div className="rounded-2xl bg-slate-800/60 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur">
            <h2 className="mb-3 text-xl font-semibold">Полином и доли участников</h2>
            <div className="h-[380px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.14)" />
                  <XAxis dataKey="x" type="number" domain={[0, Math.max(n + 1, 8)]} tick={{ fill: "#cbd5e1" }} />
                  <YAxis domain={[0, Math.min(P, 70000)]} tick={{ fill: "#cbd5e1" }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
                  <Legend />
                  {/* Линия полинома */}
                  <Line type="monotone" dataKey="y" dot={false} strokeWidth={2} name="Полином" />

                  {/* Вертикальная линия x=0 (место восстановления секрета) */}
                  <ReferenceLine x={0} strokeDasharray="4 4" label={{ value: "x=0", fill: "#cbd5e1", position: "insideTopRight" }} />

                  {/* Точки участников (как отдельный Scatter поверх LineChart) */}
                  {
                    // Хак: используем второй ScatterChart в том же контейнере для кликабельных точек
                  }
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Кликабельные точки рендерим поверх простым абсолютным списком (для плавной анимации) */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-300 md:grid-cols-3">
              {shares.map((s) => (
                <motion.button
                  key={s.id}
                  onClick={() => toggleShare(s.id)}
                  whileTap={{ scale: 0.98 }}
                  className={`rounded-xl border px-3 py-2 text-left shadow ${
                    s.selected
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
                      : "border-white/10 bg-slate-900/40 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Участник #{s.id}</span>
                    <span className="text-xs opacity-80">x={s.x}</span>
                  </div>
                  <div className="text-xs">y=<span className="tabular-nums">{s.y}</span></div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Боковая панель: восстановление */}
          <div className="rounded-2xl bg-slate-800/60 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur">
            <h2 className="mb-3 text-xl font-semibold">Восстановление секрета</h2>

            <div className="mb-4 rounded-xl bg-slate-900/60 p-3 ring-1 ring-white/10">
              <div className="mb-1 text-sm text-slate-300">Выбрано долей</div>
              <div className="text-2xl font-bold tabular-nums">
                {selected.length} <span className="text-base font-medium text-slate-400">/ {k}</span>
              </div>
              <div className="mt-1 text-xs text-slate-400">Нужно выбрать минимум k.</div>
            </div>

            <AnimatePresence mode="popLayout" initial={false}>
              {canRecover ? (
                <motion.div
                  key="ok"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className={`rounded-xl p-3 ring-1 ring-white/10 ${
                    success ? "bg-emerald-500/15 text-emerald-100" : "bg-amber-500/15 text-amber-100"
                  }`}
                >
                  <div className="text-sm">Результат интерполяции в x=0</div>
                  <div className="text-3xl font-bold tabular-nums">{recovered}</div>
                  <div className="mt-1 text-xs opacity-80">
                    {success ? "Совпадает с исходным секретом" : "Не совпадает с текущим секретом (попробуй другие доли)"}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="need"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="rounded-xl bg-slate-900/60 p-3 text-slate-300 ring-1 ring-white/10"
                >
                  Выбери ещё доли, чтобы стало хотя бы k.
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 rounded-xl bg-slate-900/50 p-3 text-xs leading-relaxed text-slate-300 ring-1 ring-white/10">
              <div className="mb-1 font-semibold">Как это работает</div>
              <p>
                Создаётся полином степени <span className="font-mono">k-1</span> с свободным членом (секретом) и случайными коэффициентами
                по модулю <span className="font-mono">P={P}</span>. Каждому участнику выдают точку <span className="font-mono">(x, y)</span> на этой кривой.
                Любые <span className="font-mono">k</span> точек однозначно задают полином → можно восстановить <span className="font-mono">f(0)</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-slate-400">
          <span className="text-xs">© {new Date().getFullYear()} Secret Sharing Lab · Демонстрация для обучения (не использовать в проде)</span>
        </div>
      </div>
    </div>
  );
}
