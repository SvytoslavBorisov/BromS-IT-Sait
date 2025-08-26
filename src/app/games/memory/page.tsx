"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Crypto Memory Match — развлекательная игра «Найди пары» с крипто‑терминами
 * Размещай как: app/games/memory/page.tsx
 * Зависимости: TailwindCSS, framer-motion (npm i framer-motion)
 *
 * Анти‑SSR‑гидрация: на сервере рендерится детерминированная болванка (пустая колода),
 * реальная перетасовка колоды происходит после маунта (useEffect) → без ошибок гидрации.
 */

// --- Библиотека терминов (хватает до 12 пар для 6×4) ---
const TOKENS = [
  "AES", "RSA", "ECC", "HMAC", "GCM", "ZKP", "DH", "OTP", "SALT", "HASH", "SBOX", "GOST",
];

// --- Типы ---
type Difficulty = "easy" | "medium" | "hard"; // 8 / 10 / 12 пар
interface Card {
  id: number;       // уникальный ID внутри колоды
  value: string;    // что нужно сопоставлять (наоборот у пары одинаковый value)
  faceUp: boolean;  // перевёрнута ли лицом вверх
  matched: boolean; // пара уже собрана
}

// --- Вспомогательные функции ---
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pairsForDifficulty(diff: Difficulty): number {
  return diff === "easy" ? 8 : diff === "medium" ? 10 : 12;
}

function columnsForDifficulty(diff: Difficulty): number {
  return diff === "easy" ? 4 : diff === "medium" ? 5 : 6; // 4×4 / 5×4 / 6×4
}

function makeDeck(pairCount: number): Card[] {
  const src = TOKENS.slice(0, pairCount);
  const base: Card[] = [];
  let id = 1;
  for (const v of src) {
    base.push({ id: id++, value: v, faceUp: false, matched: false });
    base.push({ id: id++, value: v, faceUp: false, matched: false });
  }
  return shuffle(base);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// --- Компонент страницы ---
export default function CryptoMemoryMatchPage() {
  // UI / игра
  const [mounted, setMounted] = useState(false); // для анти‑гидрации
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [deck, setDeck] = useState<Card[]>([]); // пусто на SSR
  const [selected, setSelected] = useState<number[]>([]); // индексы выбранных карт (до 2)
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Рекорды (по сложности)
  const storageKey = (diff: Difficulty) => `crypto-memory-best-${diff}`;
  const best = useMemo(() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(storageKey(difficulty)) || "null"); } catch { return null; }
  }, [difficulty]);

  // Инициализация колоды после маунта
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const deck = makeDeck(pairsForDifficulty(difficulty));
    setDeck(deck);
    setSelected([]);
    setMoves(0);
    setElapsed(0);
    setRunning(false);
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  }, [mounted, difficulty]);

  // Таймер
  useEffect(() => {
    if (!running) return;
    timerRef.current = window.setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => { if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; } };
  }, [running]);

  const matchedCount = deck.filter((c) => c.matched).length;
  const total = deck.length;
  const progress = total === 0 ? 0 : Math.round((matchedCount / total) * 100);
  const gameWon = total > 0 && matchedCount === total;

  // Сохранение рекорда при победе
  useEffect(() => {
    if (!gameWon) return;
    setRunning(false);
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    try {
      const current = { moves, time: elapsed };
      const prev = JSON.parse(localStorage.getItem(storageKey(difficulty)) || "null");
      const isBetter = !prev || current.time < prev.time || (current.time === prev.time && current.moves < prev.moves);
      if (isBetter) localStorage.setItem(storageKey(difficulty), JSON.stringify(current));
    } catch {}
  }, [gameWon, moves, elapsed, difficulty]);

  // Логика клика по карте
  const onCardClick = (idx: number) => {
    if (!mounted || total === 0) return;
    if (!running) setRunning(true);

    const c = deck[idx];
    if (c.faceUp || c.matched) return; // нельзя кликать по уже открытым/собранным

    if (selected.length === 0) {
      // открыть первую
      setDeck((d) => d.map((it, i) => (i === idx ? { ...it, faceUp: true } : it)));
      setSelected([idx]);
      return;
    }

    if (selected.length === 1) {
      // открыть вторую и проверить
      const firstIdx = selected[0];
      if (firstIdx === idx) return;
      setDeck((d) => d.map((it, i) => (i === idx ? { ...it, faceUp: true } : it)));
      setSelected([firstIdx, idx]);
      setMoves((m) => m + 1);

      const first = deck[firstIdx];
      const second = deck[idx];
      if (first.value === second.value) {
        // совпадение — зафиксировать match, оставить открытыми
        setTimeout(() => {
          setDeck((d) => d.map((it, i) => (i === firstIdx || i === idx ? { ...it, matched: true } : it)));
          setSelected([]);
        }, 350);
      } else {
        // не совпало — закрыть обе через паузу
        setTimeout(() => {
          setDeck((d) => d.map((it, i) => (i === firstIdx || i === idx ? { ...it, faceUp: false } : it)));
          setSelected([]);
        }, 650);
      }
      return;
    }

    // если уже две выбраны — игнор до сброса выбранных (через таймаут)
  };

  const restart = () => {
    if (!mounted) return;
    const deck = makeDeck(pairsForDifficulty(difficulty));
    setDeck(deck);
    setSelected([]);
    setMoves(0);
    setElapsed(0);
    setRunning(false);
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
  };

  // Рендер
  const cols = columnsForDifficulty(difficulty);

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">🃏 Crypto Memory Match</h1>
            <p className="text-slate-300">Переворачивай карточки и собирай пары крипто‑терминов. Быстрее — лучше рекорд!</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-800/60 px-3 py-2 text-sm ring-1 ring-white/10">
              Время: <span className="font-semibold tabular-nums">{formatTime(elapsed)}</span>
            </div>
            <div className="rounded-xl bg-slate-800/60 px-3 py-2 text-sm ring-1 ring-white/10">
              Ходы: <span className="font-semibold tabular-nums">{moves}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 grid gap-4 rounded-2xl bg-slate-800/60 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur md:grid-cols-[1fr_auto_auto]">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">Сложность</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 outline-none ring-indigo-400/0 focus:ring-2"
            >
              <option value="easy">Лёгкая (4×4)</option>
              <option value="medium">Средняя (5×4)</option>
              <option value="hard">Сложная (6×4)</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={restart} className="rounded-xl bg-indigo-500 px-4 py-2 text-white shadow hover:bg-indigo-400">Новая игра</button>
            <button onClick={() => setRunning((r) => !r)} className="rounded-xl bg-slate-600 px-4 py-2 text-white shadow hover:bg-slate-500">
              {running ? "Пауза" : "Старт"}
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
            {best && (
              <div className="rounded-xl bg-emerald-500/15 px-3 py-2 text-emerald-100 ring-1 ring-white/10">
                Лучший: <span className="font-semibold tabular-nums">{formatTime(best.time)}</span> · <span className="font-semibold tabular-nums">{best.moves}</span> ходов
              </div>
            )}
            <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-700/60">
              <motion.div className="h-full bg-indigo-400" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 140, damping: 20 }} />
            </div>
          </div>
        </div>

        {/* Board */}
        <div className="rounded-2xl bg-slate-800/60 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur">
          <div
            className="grid gap-3 md:gap-4"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {deck.length === 0 && (
              Array.from({ length: columnsForDifficulty(difficulty) * 4 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="aspect-[3/4] rounded-xl bg-slate-900/40 ring-1 ring-white/10" />
              ))
            )}

            {deck.map((card, idx) => (
              <CardView
                key={card.id}
                card={card}
                onClick={() => onCardClick(idx)}
              />
            ))}
          </div>

          <AnimatePresence>
            {gameWon && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 rounded-xl bg-emerald-500/15 p-3 text-center text-emerald-100 ring-1 ring-white/10"
              >
                🎉 Победа! Время <span className="font-semibold tabular-nums">{formatTime(elapsed)}</span>, ходы <span className="font-semibold tabular-nums">{moves}</span>.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 text-center text-slate-400">
          <span className="text-xs">© {new Date().getFullYear()} Crypto Memory Match · Локальные рекорды сохраняются в браузере</span>
        </div>
      </div>
    </div>
  );
}

// --- Отдельная карточка ---
function CardView({ card, onClick }: { card: Card; onClick: () => void }) {
  const { faceUp, matched, value } = card;

  return (
    <button
      onClick={onClick}
      disabled={matched}
      className={`group relative aspect-[3/4] w-full select-none rounded-xl ring-1 ring-white/10 transition-[box-shadow] ${
        matched ? "opacity-80" : "hover:shadow-[0_0_0_2px_rgba(99,102,241,0.6)]"
      }`}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: faceUp || matched ? 180 : 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Обратная сторона */}
        <div className="absolute inset-0 rounded-xl bg-slate-900/60 p-2 [backface-visibility:hidden]">
          <div className="flex h-full w-full items-center justify-center rounded-lg bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.08),transparent_50%)]">
            <span className="text-3xl">🔒</span>
          </div>
        </div>

        {/* Лицевая сторона */}
        <div className="absolute inset-0 rounded-xl bg-indigo-500/20 p-2 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div className="flex h-full w-full flex-col items-center justify-center rounded-lg bg-slate-900/40">
            <div className="text-2xl font-extrabold tracking-wide">{value}</div>
            <div className="mt-1 text-xs uppercase text-indigo-200/80">match</div>
          </div>
        </div>
      </motion.div>

      {/* Маркер совпадения */}
      <AnimatePresence>
        {matched && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute -right-1 -top-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-emerald-950 shadow"
          >
            ✓
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}