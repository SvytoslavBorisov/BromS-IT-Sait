"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Neo Mines — стильный Сапёр для Next.js App Router
 * Разместить как: app/games/mines/page.tsx
 * Зависимости: TailwindCSS, framer-motion (npm i framer-motion)
 *
 * Anti‑hydration: на сервере рендерится детерминированное пустое поле без мин;
 * реально мины раскладываются только после первого клика (safe-first-click).
 */

// ================= Типы и утилиты =================

type Difficulty = "easy" | "medium" | "hard";

interface Cell {
  r: number;
  c: number;
  mine: boolean;
  count: number;       // кол-во мин вокруг
  revealed: boolean;
  flagged: boolean;
}

interface Rules { rows: number; cols: number; mines: number; }
const RULES: Record<Difficulty, Rules> = {
  easy:   { rows: 9,  cols: 9,  mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard:   { rows: 16, cols: 30, mines: 99 },
};

const keyRC = (r: number, c: number) => `${r},${c}`;

function inBounds(r: number, c: number, rows: number, cols: number) {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

function neighbors(r: number, c: number, rows: number, cols: number) {
  const res: Array<{ r: number; c: number }> = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr, cc = c + dc;
      if (inBounds(rr, cc, rows, cols)) res.push({ r: rr, c: cc });
    }
  }
  return res;
}

function makeEmptyBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ r, c, mine: false, count: 0, revealed: false, flagged: false }))
  );
}

function layMines(board: Cell[][], mines: number, safeR: number, safeC: number) {
  // safe-first-click: не ставим мину на клетку первого клика и её соседей
  const rows = board.length, cols = board[0].length;
  const forbidden = new Set<string>([keyRC(safeR, safeC)]);
  for (const n of neighbors(safeR, safeC, rows, cols)) forbidden.add(keyRC(n.r, n.c));

  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (forbidden.has(keyRC(r, c))) continue;
    const cell = board[r][c];
    if (!cell.mine) {
      cell.mine = true;
      placed++;
    }
  }
  // посчитать числа
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].mine) { board[r][c].count = 0; continue; }
      let cnt = 0;
      for (const n of neighbors(r, c, rows, cols)) if (board[n.r][n.c].mine) cnt++;
      board[r][c].count = cnt;
    }
  }
}

function floodReveal(board: Cell[][], r: number, c: number) {
  const rows = board.length, cols = board[0].length;
  const stack = [{ r, c }];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    const k = keyRC(cur.r, cur.c);
    if (seen.has(k)) continue; seen.add(k);
    const cell = board[cur.r][cur.c];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (!cell.mine && cell.count === 0) {
      for (const n of neighbors(cur.r, cur.c, rows, cols)) if (!seen.has(keyRC(n.r, n.c))) stack.push(n);
    }
  }
}

function cloneBoard(b: Cell[][]): Cell[][] { return b.map(row => row.map(c => ({ ...c }))); }

function countFlags(b: Cell[][]): number { return b.flat().filter(c => c.flagged).length; }

function checkWin(b: Cell[][], mines: number): boolean {
  const total = b.length * b[0].length;
  const revealed = b.flat().filter(c => c.revealed).length;
  return revealed === total - mines; // все немины открыты
}

function fmtTime(s: number) { const m = Math.floor(s/60), sec = s%60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }

// ================= Компонент страницы =================

export default function NeoMinesPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const rules = RULES[difficulty];

  // анти-гидрация: начальное поле — пустое, без рандома
  const [board, setBoard] = useState<Cell[][]>(() => makeEmptyBoard(rules.rows, rules.cols));
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [flagMode, setFlagMode] = useState(false); // для мобильных: переключение режимов клик/флаг
  const timerRef = useRef<number | null>(null);

  // при смене сложности — сброс к пустому
  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // таймер
  useEffect(() => {
    if (!started || gameOver) return;
    timerRef.current = window.setInterval(() => setElapsed(t => t+1), 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [started, gameOver]);

  const minesLeft = rules.mines - countFlags(board);

  function resetGame() {
    setBoard(makeEmptyBoard(rules.rows, rules.cols));
    setStarted(false);
    setGameOver(false);
    setWin(false);
    setElapsed(0);
    setFlagMode(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function ensureMinesOnFirstClick(r: number, c: number) {
    if (started) return; // уже разложены
    const fresh = makeEmptyBoard(rules.rows, rules.cols);
    layMines(fresh, rules.mines, r, c);
    setBoard(fresh);
    setStarted(true);
  }

  function revealCell(r: number, c: number) {
    if (gameOver) return;
    const cell = board[r][c];
    if (cell.flagged || cell.revealed) return;

    ensureMinesOnFirstClick(r, c);

    setBoard(prev => {
      const b = cloneBoard(prev);
      const cur = b[r][c];
      if (cur.mine) {
        // проигрыш — открыть всё
        cur.revealed = true;
        for (const cc of b.flat()) if (cc.mine) cc.revealed = true;
        setGameOver(true);
        setWin(false);
      } else {
        floodReveal(b, r, c);
        if (checkWin(b, rules.mines)) { setGameOver(true); setWin(true); }
      }
      return b;
    });
  }

  function toggleFlag(r: number, c: number) {
    if (gameOver) return;
    const cell = board[r][c];
    if (cell.revealed) return;
    ensureMinesOnFirstClick(r, c); // если первый клик правой кнопкой — всё равно инициализируем
    setBoard(prev => {
      const b = cloneBoard(prev);
      b[r][c].flagged = !b[r][c].flagged;
      return b;
    });
  }

  // клавиатура: F — режим флага, R — рестарт
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') setFlagMode(f => !f);
      if (e.key.toLowerCase() === 'r') resetGame();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // лучший результат в localStorage (время)
  const bestKey = `neo-mines-best-${difficulty}`;
  const best = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(bestKey) || "null"); } catch { return null; }
  }, [bestKey]);

  useEffect(() => {
    if (!gameOver || !win) return;
    try {
      const prev = JSON.parse(localStorage.getItem(bestKey) || "null");
      if (!prev || elapsed < prev.time) localStorage.setItem(bestKey, JSON.stringify({ time: elapsed }));
    } catch { /* ignore */ }
  }, [gameOver, win, elapsed, bestKey]);

  // прогресс — доля открытых клеток (кроме мин)
  const progress = useMemo(() => {
    const total = rules.rows * rules.cols - rules.mines;
    const opened = board.flat().filter(c => c.revealed && !c.mine).length;
    return Math.round((opened / Math.max(1,total)) * 100);
  }, [board, rules.rows, rules.cols, rules.mines]);

  // цвет цифр
  const numColor = (n: number) => ["", "text-indigo-300", "text-emerald-300", "text-cyan-300", "text-amber-300", "text-fuchsia-300", "text-rose-300", "text-yellow-300", "text-teal-300"][n] || "text-slate-200";

  // размер клетки
  const cellSize = 40; // px

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">💣 Neo Mines</h1>
            <p className="text-slate-300">Стильный сапёр: первый клик всегда безопасен. ЛКМ — открыть, ПКМ/режим флага — поставить флажок.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-800/60 px-3 py-2 text-sm ring-1 ring-white/10">Время: <span className="font-semibold tabular-nums">{fmtTime(elapsed)}</span></div>
            <div className="rounded-xl bg-slate-800/60 px-3 py-2 text-sm ring-1 ring-white/10">Мины: <span className="font-semibold tabular-nums">{minesLeft}</span></div>
          </div>
        </div>

        {/* Панель */}
        <div className="mb-6 grid gap-4 rounded-2xl bg-slate-800/60 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur md:grid-cols-[1fr_auto_auto]">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-300">Сложность</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 outline-none ring-indigo-400/0 focus:ring-2"
            >
              <option value="easy">Лёгкая (9×9, 10 мин)</option>
              <option value="medium">Средняя (16×16, 40 мин)</option>
              <option value="hard">Сложная (30×16, 99 мин)</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setFlagMode(f=>!f)} className={`rounded-xl px-4 py-2 shadow ring-1 ring-white/10 ${flagMode?"bg-amber-500 text-amber-950":"bg-slate-600 text-white hover:bg-slate-500"}`}>{flagMode?"Режим флага: ВКЛ":"Режим флага: выкл"}</button>
            <button onClick={resetGame} className="rounded-xl bg-indigo-500 px-4 py-2 text-white shadow hover:bg-indigo-400">Новая игра (R)</button>
          </div>

          <div className="flex items-center justify-end gap-3 text-sm">
            {best && <div className="rounded-xl bg-emerald-500/15 px-3 py-2 text-emerald-100 ring-1 ring-white/10">Лучшее время: <span className="font-semibold tabular-nums">{fmtTime(best.time)}</span></div>}
            <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-700/60">
              <motion.div className="h-full bg-indigo-400" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 140, damping: 20 }} />
            </div>
          </div>
        </div>

        {/* Игровое поле */}
        <div className="flex justify-center">
          <div className="rounded-2xl bg-slate-900/60 p-3 shadow-xl ring-1 ring-white/10">
            <div
              className="grid gap-1 md:gap-1.5"
              style={{ gridTemplateColumns: `repeat(${rules.cols}, ${cellSize}px)` }}
            >
              {board.map((row, r) => (
                <React.Fragment key={`r${r}`}>
                  {row.map((cell) => (
                    <CellView
                      key={keyRC(cell.r, cell.c)}
                      cell={cell}
                      size={cellSize}
                      numColor={numColor}
                      onReveal={() => revealCell(cell.r, cell.c)}
                      onFlag={() => toggleFlag(cell.r, cell.c)}
                      flagMode={flagMode}
                    />
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Модалки */}
        <AnimatePresence>
          {gameOver && (
            <motion.div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="w-full max-w-md rounded-2xl bg-slate-900/90 p-6 text-center shadow-2xl ring-1 ring-white/10" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }}>
                <div className="text-3xl font-bold">{win ? "Победа!" : "Игра окончена"}</div>
                <div className="mt-2 text-slate-300">Время: <span className="font-semibold tabular-nums">{fmtTime(elapsed)}</span></div>
                <div className="mt-4 flex justify-center gap-3">
                  <button onClick={resetGame} className="rounded-xl bg-indigo-500 px-4 py-2 text-white shadow hover:bg-indigo-400">Новая игра</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center text-slate-400"><span className="text-xs">© {new Date().getFullYear()} Neo Mines · Лучшее время сохраняется локально</span></div>
      </div>
    </div>
  );
}

// ================= Клетка =================

function CellView({ cell, size, numColor, onReveal, onFlag, flagMode }: {
  cell: Cell;
  size: number;
  numColor: (n:number)=>string;
  onReveal: () => void;
  onFlag: () => void;
  flagMode: boolean;
}) {
  const { revealed, mine, flagged, count } = cell;
  const content = revealed ? (mine ? "💥" : (count > 0 ? String(count) : "")) : (flagged ? "🚩" : "");

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => (flagMode ? onFlag() : onReveal())}
      onContextMenu={(e) => { e.preventDefault(); onFlag(); }}
      className={`relative flex items-center justify-center rounded-lg text-lg font-extrabold tabular-nums ring-1 ring-white/10 ${
        revealed
          ? (mine ? "bg-rose-500/20 text-rose-100" : "bg-slate-800/70 text-slate-50")
          : (flagged ? "bg-amber-500/20 text-amber-100" : "bg-slate-900/60 hover:bg-slate-900/80 text-slate-200")
      }`}
      style={{ width: size, height: size }}
      title={revealed ? (mine ? "Мина" : count ? `${count}` : "Пусто") : (flagged ? "Флажок" : "")}
    >
      <span className={`select-none ${revealed && !mine && count>0 ? numColor(count) : ""}`}>{content}</span>
    </motion.button>
  );
}
