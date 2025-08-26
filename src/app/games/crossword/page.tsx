"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ------------------------------------------------------------
// Crypto Crossword — single-file page for Next.js App Router
// Path: app/crypto/crossword/page.tsx
// Styling: TailwindCSS (no extra imports needed)
// Animations: framer-motion (npm i framer-motion)
// Features: auto‑генерация сетки из слов, клавиатура, подсказки, проверка,
//           подсветка активного слова, прогресс, таймер, сохранение в localStorage
// ------------------------------------------------------------

// === СЛОВА И ПОДСКАЗКИ (все буквы A–Z без пробелов/цифр) ===
const WORDS: Array<{ answer: string; clue: string }> = [
  { answer: "AES", clue: "Блоковый стандарт шифрования NIST (2001)." },
  { answer: "RSA", clue: "Классический алгоритм с открытым ключом (1977)." },
  { answer: "ECC", clue: "Криптография на эллиптических кривых (abbr.)." },
  { answer: "HMAC", clue: "MAC на основе хеш‑функции и ключа." },
  { answer: "SALT", clue: "Случайная добавка к паролю." },
  { answer: "HASH", clue: "Односторонняя функция свёртки." },
  { answer: "KEY", clue: "Секретный или открытый материал для алгоритма." },
  { answer: "IV", clue: "Инициализирующий вектор (abbr.)." },
  { answer: "SBOX", clue: "Нелинейное подстановочное ядро блочного шифра." },
  { answer: "GOST", clue: "Российский стандарт (например, 34.11‑2012)." },
  { answer: "MAGMA", clue: "ГОСТ 28147‑89: неофициальное название." },
  { answer: "CHACHA", clue: "Поточный шифр Бернстайна (вариант Salsa)." },
  { answer: "POLY", clue: "Полином, часто в поле GF(2^n)." },
  { answer: "PRIME", clue: "Простое число." },
  { answer: "MOD", clue: "Операция по модулю." },
  { answer: "XOR", clue: "Сложение по модулю 2 (логическая операция)." },
  { answer: "OTP", clue: "Одноразовый блокнот (one‑time pad)." },
  { answer: "LFSR", clue: "Линейный регистр сдвига с обратной связью." },
  { answer: "ZKP", clue: "Доказательство с нулевым разглашением (abbr.)." },
  { answer: "NONCE", clue: "Одноразовое число (для уникальности)." },
  { answer: "KDF", clue: "Вывод ключей из исходного секрета (abbr.)." },
  { answer: "HKDF", clue: "KDF на основе HMAC (RFC 5869)." },
  { answer: "CBC", clue: "Режим сцепления блоков (abbr.)." },
  { answer: "CTR", clue: "Счётчикный режим (abbr.)." },
  { answer: "OFB", clue: "Output Feedback режим (abbr.)." },
  { answer: "GCM", clue: "Аутентифицирующий режим на основе счётчика." },
  { answer: "FELDMAN", clue: "VSS‑схема для Шамира (фамилия)." },
  { answer: "SHAMIR", clue: "Автор порогового разделения секрета (фамилия)." },
  { answer: "DH", clue: "Ключевой обмен Диффи‑Хеллмана (abbr.)." },
];

// === Типы ===
type Cell = { r: number; c: number; ch: string };
type Dir = "ACROSS" | "DOWN";

// === Утилиты ===
const keyRC = (r: number, c: number) => `${r},${c}`;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const isLetter = (s: string) => /^[A-Z]$/.test(s);

// === Простая генерация кроссворда: размещаем слова с пересечениями ===
// Алгоритм жадный: первый — по горизонтали, остальные стараемся
// наложить по общей букве; если не вышло — добавляем слово ниже.
function generateLayout(words: string[]) {
  // Координатная сетка как словарь: "r,c" -> буква
  const grid = new Map<string, string>();
  let minR = 0, maxR = 0, minC = 0, maxC = 0;

  const placed: Array<{ answer: string; dir: Dir; r: number; c: number }>
    = [];

  const placeWord = (answer: string, dir: Dir, r: number, c: number) => {
    for (let i = 0; i < answer.length; i++) {
      const rr = dir === "ACROSS" ? r : r + i;
      const cc = dir === "ACROSS" ? c + i : c;
      grid.set(keyRC(rr, cc), answer[i]);
      minR = Math.min(minR, rr); maxR = Math.max(maxR, rr);
      minC = Math.min(minC, cc); maxC = Math.max(maxC, cc);
    }
    placed.push({ answer, dir, r, c });
  };

  const canPlaceAt = (
    answer: string, dir: Dir, r: number, c: number
  ) => {
    for (let i = 0; i < answer.length; i++) {
      const rr = dir === "ACROSS" ? r : r + i;
      const cc = dir === "ACROSS" ? c + i : c;
      const k = keyRC(rr, cc);
      const existing = grid.get(k);
      if (existing && existing !== answer[i]) return false;

      // Небольшое правило: не даём касаться боками по направлению
      // (чтобы слова не слипались без общей буквы)
      if (existing !== answer[i]) {
        if (dir === "ACROSS") {
          if (grid.has(keyRC(rr - 1, cc)) || grid.has(keyRC(rr + 1, cc))) return false;
        } else {
          if (grid.has(keyRC(rr, cc - 1)) || grid.has(keyRC(rr, cc + 1))) return false;
        }
      }
    }
    // Проверяем концы слова — там не должно быть продолжения по направлению
    const before = dir === "ACROSS" ? keyRC(r, c - 1) : keyRC(r - 1, c);
    const after = dir === "ACROSS" ? keyRC(r, c + answer.length) : keyRC(r + answer.length, c);
    if (grid.has(before) || grid.has(after)) return false;
    return true;
  };

  // 1) кладём первое слово по центру
  const first = words[0];
  placeWord(first, "ACROSS", 0, 0);

  // 2) остальные — с попыткой максимального пересечения
  words.slice(1).forEach((w, idx) => {
    let best: { dir: Dir; r: number; c: number; score: number } | null = null;
    for (let i = 0; i < w.length; i++) {
      const ch = w[i];
      for (const [k, letter] of grid.entries()) {
        if (letter !== ch) continue;
        const [gr, gc] = k.split(",").map(Number);
        // попробовать положить поперёк существующей буквы
        // горизонтально
        const cStart = gc - i;
        if (canPlaceAt(w, "ACROSS", gr, cStart)) {
          const score = w.length; // простая метрика
          if (!best || score > best.score) best = { dir: "ACROSS", r: gr, c: cStart, score };
        }
        // вертикально
        const rStart = gr - i;
        if (canPlaceAt(w, "DOWN", rStart, gc)) {
          const score = w.length;
          if (!best || score > best.score) best = { dir: "DOWN", r: rStart, c: gc, score };
        }
      }
    }
    if (best) {
      placeWord(w, best.dir, best.r, best.c);
    } else {
      // если не нашли пересечений — положим ниже всей конструкции
      placeWord(w, idx % 2 ? "ACROSS" : "DOWN", maxR + 2, minC);
    }
  });

  // нормализуем к нулю
  const offR = -minR, offC = -minC;
  const width = maxC - minC + 1;
  const height = maxR - minR + 1;

  const solution: string[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => "#"));
  for (const [k, v] of grid.entries()) {
    const [r, c] = k.split(",").map(Number);
    solution[r + offR][c + offC] = v;
  }

  return { solution, width, height };
}

// Получение списков слов по направлениям и координатам
function enumerateClues(solution: string[][]) {
  const H = solution.length, W = solution[0].length;
  const across: Array<{ num: number; r: number; c: number; answer: string }>=[];
  const down: Array<{ num: number; r: number; c: number; answer: string }>=[];
  let num = 1;

  const isStartAcross = (r: number, c: number) => solution[r][c] !== "#" && (c === 0 || solution[r][c-1] === "#") && (c+1 < W && solution[r][c+1] !== "#");
  const isStartDown   = (r: number, c: number) => solution[r][c] !== "#" && (r === 0 || solution[r-1][c] === "#") && (r+1 < H && solution[r+1][c] !== "#");

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (isStartAcross(r, c)) {
        let cc = c, ans = "";
        while (cc < W && solution[r][cc] !== "#") { ans += solution[r][cc]; cc++; }
        across.push({ num, r, c, answer: ans });
        num++;
      }
      if (isStartDown(r, c)) {
        let rr = r, ans = "";
        while (rr < H && solution[rr][c] !== "#") { ans += solution[rr][c]; rr++; }
        down.push({ num, r, c, answer: ans });
        num++;
      }
    }
  }
  return { across, down };
}

// Подсказки по ответу
const CLUE_BY_ANSWER = Object.fromEntries(WORDS.map(w => [w.answer, w.clue]));

// === Компонент страницы ===
export default function CryptoCrosswordPage() {
  const [seed] = useState(() => Math.floor(Math.random()*1e9));
  const words = useMemo(() => {
    // лёгкая рандомизация порядка для реиграбельности
    const arr = [...WORDS].sort((a,b)=> (a.answer+b.answer+seed).localeCompare(b.answer+a.answer+seed));
    // ограничим до 18–22 слов — баланс визуально
    return arr.slice(0, 20).map(w => w.answer);
  }, [seed]);

  const { solution, width, height } = useMemo(() => generateLayout(words), [words]);
  const { across, down } = useMemo(() => enumerateClues(solution), [solution]);

  // Текущее состояние ввода
  const totalLetters = useMemo(() => solution.flat().filter(ch => ch !== "#").length, [solution]);
  const [grid, setGrid] = useState<string[][]>(() => solution.map(row => row.map(ch => (ch === "#" ? "#" : ""))));
  const [sel, setSel] = useState<{ r: number; c: number; dir: Dir } | null>(null);
  const [shake, setShake] = useState<Set<string>>(new Set());
  const [startTs] = useState<number>(() => Date.now());
  const [showHelp, setShowHelp] = useState(false);

  // Сохранение прогресса
  useEffect(() => {
    const key = `crypto-xw-${width}x${height}-${seed}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === height && parsed[0].length === width) {
          setGrid(parsed);
        }
      } catch {}
    }
  }, [width, height, seed]);

  useEffect(() => {
    const key = `crypto-xw-${width}x${height}-${seed}`;
    localStorage.setItem(key, JSON.stringify(grid));
  }, [grid, width, height, seed]);

  const solvedCount = useMemo(() => {
    let ok = 0;
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (solution[r][c] !== "#" && grid[r][c].toUpperCase() === solution[r][c]) ok++;
      }
    }
    return ok;
  }, [grid, solution, width, height]);

  // Навигация по слову
  function findWord(r: number, c: number, dir: Dir) {
    if (solution[r][c] === "#") return { cells: [] as Array<{r:number;c:number}> };
    let rr = r, cc = c;
    // к началу слова
    if (dir === "ACROSS") { while (cc-1 >= 0 && solution[rr][cc-1] !== "#") cc--; }
    else { while (rr-1 >= 0 && solution[rr-1][cc] !== "#") rr--; }
    const cells: Array<{r:number;c:number}> = [];
    // до конца слова
    if (dir === "ACROSS") { while (cc < width && solution[rr][cc] !== "#") { cells.push({r: rr, c: cc}); cc++; } }
    else { while (rr < height && solution[rr][cc] !== "#") { cells.push({r: rr, c: cc}); rr++; } }
    return { cells };
  }

  const activeWord = sel ? findWord(sel.r, sel.c, sel.dir) : { cells: [] as Array<{r:number;c:number}> };
  const activeAnswer = activeWord.cells.map(({r,c})=>solution[r][c]).join("");
  const activeClue = (CLUE_BY_ANSWER as any)[activeAnswer];

  // Обработчики
  const onCellClick = (r: number, c: number) => {
    if (solution[r][c] === "#") return;
    // Если повторный клик по той же — сменить направление
    setSel(prev => (prev && prev.r===r && prev.c===c) ? { r, c, dir: prev.dir === "ACROSS" ? "DOWN" : "ACROSS" } : { r, c, dir: prev?.dir ?? "ACROSS" });
  };

  const move = (dr: number, dc: number) => {
    if (!sel) return;
    let r = sel.r + dr;
    let c = sel.c + dc;
    r = clamp(r, 0, height-1);
    c = clamp(c, 0, width-1);
    if (solution[r][c] === "#") return; // не прыгаем в стену
    setSel({ r, c, dir: sel.dir });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!sel) return;
      const key = e.key.toUpperCase();
      if (key === "ARROWLEFT") { e.preventDefault(); move(0, -1); return; }
      if (key === "ARROWRIGHT") { e.preventDefault(); move(0, 1); return; }
      if (key === "ARROWUP") { e.preventDefault(); move(-1, 0); return; }
      if (key === "ARROWDOWN") { e.preventDefault(); move(1, 0); return; }
      if (key === " " || key === "TAB") { e.preventDefault(); setSel(s => s && ({...s, dir: s.dir === "ACROSS"?"DOWN":"ACROSS"})); return; }
      if (key === "BACKSPACE") {
        e.preventDefault();
        const { cells } = activeWord;
        const idx = cells.findIndex(p => p.r===sel.r && p.c===sel.c);
        const prev = idx>0 ? cells[idx-1] : cells[0];
        setGrid(g => {
          const copy = g.map(row => row.slice());
          copy[sel.r][sel.c] = "";
          return copy;
        });
        setSel({ r: prev.r, c: prev.c, dir: sel.dir });
        return;
      }
      if (isLetter(key)) {
        e.preventDefault();
        setGrid(g => {
          const copy = g.map(row => row.slice());
          copy[sel.r][sel.c] = key;
          return copy;
        });
        const { cells } = activeWord;
        const idx = cells.findIndex(p => p.r===sel.r && p.c===sel.c);
        const next = idx < cells.length-1 ? cells[idx+1] : cells[idx];
        setSel({ r: next.r, c: next.c, dir: sel.dir });
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, activeWord]);

  // Проверка текущего слова
  const checkActive = () => {
    if (!sel) return;
    const { cells } = activeWord;
    const toShake = new Set<string>();
    setGrid(g => {
      const copy = g.map(row => row.slice());
      cells.forEach(({r,c}) => {
        if (copy[r][c] && copy[r][c].toUpperCase() !== solution[r][c]) {
          toShake.add(keyRC(r,c));
        }
      });
      return copy;
    });
    setShake(toShake);
    setTimeout(() => setShake(new Set()), 400);
  };

  const revealActive = () => {
    if (!sel) return;
    const { cells } = activeWord;
    setGrid(g => {
      const copy = g.map(row => row.slice());
      cells.forEach(({r,c}) => { copy[r][c] = solution[r][c]; });
      return copy;
    });
  };

  const revealAll = () => {
    setGrid(solution.map(row => row.map(ch => (ch === "#" ? "#" : ch))));
  };

  const reset = () => {
    setGrid(solution.map(row => row.map(ch => (ch === "#" ? "#" : ""))));
    setSel(null);
  };

  const seconds = Math.floor((Date.now() - startTs) / 1000);
  const mm = String(Math.floor(seconds/60)).padStart(2,"0");
  const ss = String(seconds%60).padStart(2,"0");
  const progress = Math.round((solvedCount / totalLetters) * 100);

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">🧩 Crypto Crossword</h1>
            <p className="text-slate-300">Клавиатура: A–Z, стрелки, Backspace, Space — смена направления.</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold tabular-nums">{mm}:{ss}</div>
            <div className="mt-1 text-sm text-slate-300">Прогресс: {progress}%</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-700/60">
          <motion.div
            className="h-full bg-indigo-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 140, damping: 20 }}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-[auto,1fr]">
          {/* GRID */}
          <div className="rounded-2xl bg-slate-800/60 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur">
            <div className="mx-auto inline-block">
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${width}, 2.5rem)` }}
              >
                {solution.map((row, r) => (
                  <React.Fragment key={r}>
                    {row.map((sol, c) => {
                      const isBlock = sol === "#";
                      const isActive = !!sel && activeWord.cells.some(p => p.r===r && p.c===c);
                      const isCursor = !!sel && sel.r === r && sel.c === c;
                      const k = keyRC(r,c);
                      const incorrect = shake.has(k);
                      return (
                        <motion.button
                          key={k}
                          onClick={() => onCellClick(r, c)}
                          className={`relative h-10 w-10 border text-center font-semibold uppercase ${
                            isBlock ? "bg-slate-900/70 border-slate-700" :
                            "bg-slate-900/40 border-slate-600 hover:border-indigo-400"
                          } ${isActive ? "ring-2 ring-indigo-400" : ""} ${isCursor ? "z-10 shadow-[0_0_0_2px_rgba(99,102,241,0.8)]" : ""}`}
                          initial={false}
                          animate={incorrect ? { x: [0,-6,6,-3,3,0] } : { x: 0 }}
                          transition={{ duration: 0.28 }}
                        >
                          {isBlock ? (
                            <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.06),transparent_50%)]" />
                          ) : (
                            <span className="pointer-events-none select-none text-xl leading-10">
                              {grid[r][c]}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Active clue */}
            <AnimatePresence>
              {sel && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-4 rounded-xl bg-slate-900/60 p-3 text-sm text-slate-200 ring-1 ring-white/10"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-indigo-200">{sel.dir === "ACROSS" ? "По горизонтали" : "По вертикали"}</span>
                    <span className="text-slate-400">Длина: {activeWord.cells.length}</span>
                  </div>
                  <div className="font-medium">
                    {activeClue ?? "Выделите слово — покажу подсказку."}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={checkActive} className="rounded-xl bg-indigo-500 px-4 py-2 text-white shadow hover:bg-indigo-400">Проверить слово</button>
              <button onClick={revealActive} className="rounded-xl bg-emerald-500 px-4 py-2 text-white shadow hover:bg-emerald-400">Показать слово</button>
              <button onClick={revealAll} className="rounded-xl bg-rose-500 px-4 py-2 text-white shadow hover:bg-rose-400">Показать всё</button>
              <button onClick={reset} className="rounded-xl bg-slate-600 px-4 py-2 text-white shadow hover:bg-slate-500">Сбросить</button>
              <button onClick={() => setShowHelp(v=>!v)} className="ml-auto rounded-xl border border-white/15 px-4 py-2 text-slate-100 hover:bg-white/10">Справка</button>
            </div>

            <AnimatePresence>
              {showHelp && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 text-sm text-slate-300">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Клик по ячейке — выбрать. Повторный клик — сменить направление.</li>
                    <li>Клавиши: A–Z — ввод, стрелки — навигация, Backspace — удалить, Space — сменить направление.</li>
                    <li>Прогресс сохраняется в браузере автоматически.</li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CLUES */}
          <div className="rounded-2xl bg-slate-800/60 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur">
            <h2 className="mb-3 text-xl font-semibold">Подсказки</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm uppercase tracking-wider text-slate-400">По горизонтали</h3>
                <div className="space-y-1">
                  {across.map(({ num, r, c, answer }) => (
                    <button
                      key={`A${num}`}
                      onClick={() => setSel({ r, c, dir: "ACROSS" })}
                      className={`block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5 ${activeAnswer===answer?"bg-indigo-400/15 ring-1 ring-indigo-400/40":""}`}
                    >
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-xs">{num}</span>
                      <span className="font-medium">{CLUE_BY_ANSWER[answer] || "—"}</span>
                      <span className="ml-2 text-slate-400">({answer.length})</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm uppercase tracking-wider text-slate-400">По вертикали</h3>
                <div className="space-y-1">
                  {down.map(({ num, r, c, answer }) => (
                    <button
                      key={`D${num}`}
                      onClick={() => setSel({ r, c, dir: "DOWN" })}
                      className={`block w-full rounded-lg px-3 py-2 text-left hover:bg-white/5 ${activeAnswer===answer?"bg-indigo-400/15 ring-1 ring-indigo-400/40":""}`}
                    >
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-xs">{num}</span>
                      <span className="font-medium">{CLUE_BY_ANSWER[answer] || "—"}</span>
                      <span className="ml-2 text-slate-400">({answer.length})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-400">
          <span className="text-xs">© {new Date().getFullYear()} Crypto Crossword · Генерация на клиенте, слова: {WORDS.length}</span>
        </div>
      </div>
    </div>
  );
}
