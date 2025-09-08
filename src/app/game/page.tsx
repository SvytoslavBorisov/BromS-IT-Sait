"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Crypto 2048 — красивая реализация 2048 для Next.js App Router
 * Разместить как: app/games/2048/page.tsx
 * Зависимости: TailwindCSS, framer-motion (npm i framer-motion)
 * Anti-hydration: первый SSR — детерминистичная пустая доска; рандом инициализации — в useEffect.
 */

// ======== Типы ========
 type Board = number[][]; // 0 = пусто
 type Dir = "left" | "right" | "up" | "down";

// ======== Константы ========
const SIZE = 4;
const START_TILES = 2;
const PROB_FOUR = 0.1; // 10% шанс на 4

// ======== Утилиты ========
const emptyBoard = (size = SIZE): Board => Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
const cloneBoard = (b: Board): Board => b.map((row) => row.slice());

function boardEquals(a: Board, b: Board): boolean {
  for (let r = 0; r < a.length; r++) for (let c = 0; c < a[r].length; c++) if (a[r][c] !== b[r][c]) return false;
  return true;
}

function rotateRight(b: Board): Board {
  const n = b.length;
  const out = emptyBoard(n);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out[c][n - 1 - r] = b[r][c];
  return out;
}
function rotateLeft(b: Board): Board { return rotateRight(rotateRight(rotateRight(b))); }
function flipH(b: Board): Board { return b.map((row) => row.slice().reverse()); }

function randomEmptyCell(b: Board): { r: number; c: number } | null {
  const cells: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < b.length; r++) for (let c = 0; c < b[r].length; c++) if (b[r][c] === 0) cells.push({ r, c });
  if (!cells.length) return null;
  return cells[Math.floor(Math.random() * cells.length)];
}

function addRandomTile(b: Board): Board {
  const cell = randomEmptyCell(b);
  if (!cell) return b;
  const v = Math.random() < PROB_FOUR ? 4 : 2;
  const nb = cloneBoard(b);
  nb[cell.r][cell.c] = v;
  return nb;
}

function compressRowLeft(row: number[]): { row: number[]; gained: number } {
  const filtered = row.filter((x) => x !== 0);
  const res: number[] = [];
  let gained = 0;
  for (let i = 0; i < filtered.length; i++) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      res.push(merged);
      gained += merged;
      i++; // skip next
    } else {
      res.push(filtered[i]);
    }
  }
  while (res.length < row.length) res.push(0);
  return { row: res, gained };
}

function moveLeft(board: Board): { board: Board; moved: boolean; gained: number } {
  let moved = false;
  let gained = 0;
  const out = board.map((row) => {
    const { row: r, gained: g } = compressRowLeft(row);
    gained += g;
    if (!moved && r.some((v, i) => v !== row[i])) moved = true;
    return r;
  });
  return { board: out, moved, gained };
}

function move(board: Board, dir: Dir): { board: Board; moved: boolean; gained: number } {
  if (dir === "left") return moveLeft(board);
  if (dir === "right") {
    const { board: b, moved, gained } = moveLeft(flipH(board));
    return { board: flipH(b), moved, gained };
  }
  if (dir === "up") {
    const { board: b, moved, gained } = moveLeft(rotateLeft(board));
    return { board: rotateRight(b), moved, gained };
  }
  // down
  const { board: b, moved, gained } = moveLeft(rotateRight(board));
  return { board: rotateLeft(b), moved, gained };
}

function hasMoves(b: Board): boolean {
  // есть пустая клетка?
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (b[r][c] === 0) return true;
  // либо возможны слияния
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const v = b[r][c];
    if (r + 1 < SIZE && b[r + 1][c] === v) return true;
    if (c + 1 < SIZE && b[r][c + 1] === v) return true;
  }
  return false;
}

// Красивые цвета под плитки
const PALETTE: Record<number, string> = {
  0: "bg-slate-900/40 text-slate-500",
  2: "bg-indigo-500/20 text-indigo-100",
  4: "bg-indigo-500/30 text-indigo-100",
  8: "bg-emerald-500/25 text-emerald-100",
  16: "bg-emerald-500/35 text-emerald-50",
  32: "bg-teal-500/35 text-teal-50",
  64: "bg-cyan-500/35 text-cyan-50",
  128: "bg-fuchsia-500/35 text-fuchsia-100",
  256: "bg-rose-500/35 text-rose-100",
  512: "bg-amber-500/35 text-amber-900",
  1024: "bg-yellow-400/80 text-yellow-950",
  2048: "bg-yellow-300 text-yellow-900",
};

function tileClass(v: number) { return PALETTE[v] || "bg-white/80 text-slate-900"; }

function formatScore(n: number) { return n.toLocaleString("en-US"); }

export default function Crypto2048Page() {
  // Anti-hydration: детерминированная пустая доска
  const [mounted, setMounted] = useState(false);
  const [board, setBoard] = useState<Board>(() => emptyBoard());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [history, setHistory] = useState<{ board: Board; score: number }[]>([]); // для Undo

  // Загрузка best после маунта
  useEffect(() => {
    setMounted(true);
    try {
      const b = Number(localStorage.getItem("crypto2048-best") || "0");
      if (!Number.isNaN(b)) setBest(b);
    } catch {}
  }, []);

  // Инициализация игры после маунта
  useEffect(() => {
    if (!mounted) return;
    startNew();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const startNew = useCallback(() => {
    let b = emptyBoard();
    for (let i = 0; i < START_TILES; i++) b = addRandomTile(b);
    setBoard(b);
    setScore(0);
    setWon(false);
    setLost(false);
    setHistory([]);
  }, []);

  const pushHistory = useCallback((b: Board, s: number) => {
    setHistory((h) => [...h.slice(-19), { board: cloneBoard(b), score: s }]); // хранить до 20
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setBoard(prev.board);
      setScore(prev.score);
      setWon(false);
      setLost(false);
      return h.slice(0, -1);
    });
  }, []);

  const doMove = useCallback((dir: Dir) => {
    if (won || lost) return;
    const { board: movedBoard, moved, gained } = move(board, dir);
    if (!moved) return;
    pushHistory(board, score);
    let next = addRandomTile(movedBoard);
    setBoard(next);
    const newScore = score + gained;
    setScore(newScore);
    if (newScore > best) {
      setBest(newScore);
      try { localStorage.setItem("crypto2048-best", String(newScore)); } catch {}
    }
    // win?
    if (next.some((row) => row.some((v) => v >= 2048))) setWon(true);
    // lose?
    if (!hasMoves(next)) setLost(true);
  }, [board, score, best, pushHistory, won, lost]);

  // Управление клавиатурой
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "A", "D", "W", "S"].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") doMove("left");
      else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") doMove("right");
      else if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") doMove("up");
      else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") doMove("down");
      else if (e.key.toLowerCase() === "r") startNew();
      else if (e.key.toLowerCase() === "z") undo();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doMove, startNew, undo]);

  const progress = useMemo(() => {
    const maxTile = Math.max(...board.flat());
    // условная шкала прогресса до 2048
    const stages = [0,2,4,8,16,32,64,128,256,512,1024,2048];
    const idx = stages.findIndex((t) => t >= maxTile);
    const p = Math.round(((idx === -1 ? stages.length - 1 : idx) / (stages.length - 1)) * 100);
    return p;
  }, [board]);

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">🧮 Crypto 2048</h1>
            <p className="text-slate-300">Соединяй одинаковые плитки, чтобы получить 2048. Управление: стрелки / WASD. Undo: Z, Новая игра: R.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-800/60 px-3 py-2 text-sm ring-1 ring-white/10">Счёт: <span className="font-semibold tabular-nums">{formatScore(score)}</span></div>
            <div className="rounded-xl bg-slate-800/60 px-3 py-2 text-sm ring-1 ring-white/10">Рекорд: <span className="font-semibold tabular-nums">{formatScore(best)}</span></div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 grid gap-4 rounded-2xl bg-slate-800/60 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur md:grid-cols-[1fr_auto_auto]">
          <div className="flex items-center gap-3 text-sm">
            <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-700/60">
              <motion.div className="h-full bg-indigo-400" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 140, damping: 20 }} />
            </div>
            <span className="text-slate-300">Прогресс до 2048: {progress}%</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={undo} className="rounded-xl bg-slate-600 px-4 py-2 text-white shadow hover:bg-slate-500">Undo (Z)</button>
            <button onClick={startNew} className="rounded-xl bg-indigo-500 px-4 py-2 text-white shadow hover:bg-indigo-400">Новая игра (R)</button>
          </div>
          <div className="flex items-center justify-end gap-2 text-slate-300 md:justify-end">
            <Dpad onMove={doMove} />
          </div>
        </div>

        {/* Board */}
        <div className="flex justify-center">
          <div className="rounded-2xl bg-slate-900/60 p-3 shadow-xl ring-1 ring-white/10">
            <div className="grid gap-3 p-3" style={{ gridTemplateColumns: `repeat(${SIZE}, 5.5rem)` }}>
              {board.map((row, r) => (
                <React.Fragment key={`r${r}`}>
                  {row.map((v, c) => (
                    <Tile key={`r${r}c${c}`} value={v} />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {(won || lost) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="w-full max-w-md rounded-2xl bg-slate-900/90 p-6 text-center shadow-2xl ring-1 ring-white/10">
                <div className="text-3xl font-bold">{won ? "Победа!" : "Игра окончена"}</div>
                <div className="mt-2 text-slate-300">Счёт: <span className="font-semibold tabular-nums">{formatScore(score)}</span>{" "}· Рекорд: <span className="font-semibold tabular-nums">{formatScore(best)}</span></div>
                <div className="mt-4 flex justify-center gap-3">
                  <button onClick={undo} className="rounded-xl bg-slate-600 px-4 py-2 text-white shadow hover:bg-slate-500">Undo</button>
                  <button onClick={startNew} className="rounded-xl bg-indigo-500 px-4 py-2 text-white shadow hover:bg-indigo-400">Новая игра</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center text-slate-400"><span className="text-xs">© {new Date().getFullYear()} Crypto 2048 · Локальный рекорд сохраняется в браузере</span></div>
      </div>
    </div>
  );
}

function Tile({ value }: { value: number }) {
  const cls = tileClass(value);
  const text = value === 0 ? "" : String(value);
  return (
    <motion.div
      layout
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex h-22 w-22 items-center justify-center rounded-xl p-4 text-2xl font-extrabold tabular-nums shadow-inner ring-1 ring-white/10 ${cls}`}
      style={{ height: "5.5rem", width: "5.5rem" }}
    >
      {text}
    </motion.div>
  );
}

function Dpad({ onMove }: { onMove: (d: Dir) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 text-sm">
      <div />
      <button onClick={() => onMove("up")} className="rounded-lg bg-slate-800/60 px-3 py-2 ring-1 ring-white/10 hover:bg-slate-700/60">↑</button>
      <div />
      <button onClick={() => onMove("left")} className="rounded-lg bg-slate-800/60 px-3 py-2 ring-1 ring-white/10 hover:bg-slate-700/60">←</button>
      <div />
      <button onClick={() => onMove("right")} className="rounded-lg bg-slate-800/60 px-3 py-2 ring-1 ring-white/10 hover:bg-slate-700/60">→</button>
      <div />
      <button onClick={() => onMove("down")} className="rounded-lg bg-slate-800/60 px-3 py-2 ring-1 ring-white/10 hover:bg-slate-700/60 col-span-3">↓</button>
    </div>
  );
}
