
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * COLOR LABYRINTH — готовая мини‑игра (один файл)
 * 
 * Правила:
 *  • Игрок стартует в тёмном углу и должен дойти до самой светлой клетки (цели).
 *  • Ходить можно только на соседние клетки (вверх/вниз/влево/вправо),
 *    если их цвет "достаточно близок" текущему по Hue/Saturation и не темнее по Lightness.
 *  • После каждого хода показываем живую человеческую подсказку ("чуть теплее", "посветлее" и т.п.).
 * 
 * Визуал:
 *  • Компактные цветовые квадраты.
 *  • Палитра фона — фото мастерской с тёмной вуалью (положите картинку в public/images/atelier.jpg)
 *  • Хедер со статистикой, блок подсказок справа.
 */

// ─────────────────────────────────────────────────────────────────────────────
// УТИЛИТЫ ЦВЕТА
// ─────────────────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mod360 = (x: number) => ((x % 360) + 360) % 360;
function hueDeltaDeg(a: number, b: number) { const d = Math.abs(mod360(a) - mod360(b)) % 360; return d > 180 ? 360 - d : d; }
const hslCss = (h: number, s: number, l: number) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;

// Человечные описания
function hueName(h: number) {
  const ranges: Array<[number, string]> = [
    [0, 'алый'], [15, 'красно-оранжевый'], [30, 'оранжевый'], [45, 'янтарный'],
    [60, 'жёлтый'], [90, 'лаймовый'], [120, 'зелёный'], [150, 'зеленовато-бирюзовый'],
    [180, 'бирюзовый'], [210, 'лазурный'], [240, 'синий'], [270, 'фиолетовый'],
    [300, 'пурпурный'], [330, 'малиновый'], [360, 'алый']
  ];
  const x = mod360(h);
  let last = ranges[0][1];
  for (const [deg, name] of ranges) if (x >= deg) last = name;
  return last;
}
function satWord(s: number) { if (s < 0.18) return 'приглушённый'; if (s < 0.45) return 'мягкий'; if (s < 0.75) return 'насыщенный'; return 'сочный'; }
function lightWord(l: number) { if (l < 0.18) return 'очень тёмный'; if (l < 0.35) return 'тёмный'; if (l < 0.65) return 'средний по светлоте'; if (l < 0.85) return 'светлый'; return 'очень светлый'; }
function tempWord(h: number) { const x = mod360(h); const warm = x <= 60 || x >= 330; const cold = x >= 180 && x <= 260; return warm ? 'тёплый' : cold ? 'холодный' : 'нейтральный'; }
function humanDesc(h: number, s: number, l: number) { return `${tempWord(h)} ${hueName(h)}, ${satWord(s)}, ${lightWord(l)}`; }
function signedHueDelta(from: number, to: number) { return ((to - from + 540) % 360) - 180; }

// ─────────────────────────────────────────────────────────────────────────────
// ИГРОВЫЕ ТИПЫ И НАСТРОЙКИ
// ─────────────────────────────────────────────────────────────────────────────
type Cell = { x: number; y: number; h: number; s: number; l: number; onPath?: boolean; start?: boolean; goal?: boolean };

type Difficulty = 'easy' | 'normal' | 'hard';
const DIFFS: Record<Difficulty, { H: number; S: number; Lstep: number; allowEqualL: boolean }> = {
  easy:   { H: 36, S: 0.28, Lstep: 0.22, allowEqualL: true },
  normal: { H: 28, S: 0.22, Lstep: 0.18, allowEqualL: true },
  hard:   { H: 18, S: 0.15, Lstep: 0.14, allowEqualL: false },
};

// Размер сетки
const DEFAULT_W = 12;
const DEFAULT_H = 12;

// ─────────────────────────────────────────────────────────────────────────────
// ГЕНЕРАЦИЯ УРОВНЯ
// ─────────────────────────────────────────────────────────────────────────────
function rand(min: number, max: number) { return min + Math.random() * (max - min); }
function irand(min: number, max: number) { return Math.floor(rand(min, max + 1)); }

function makeMonotonePath(w: number, h: number): Array<[number, number]> {
  // Монотонный путь из (0,h-1) в (w-1,0) — всегда существует и короткий
  const path: Array<[number, number]> = [];
  let x = 0, y = h - 1;
  path.push([x, y]);
  while (x < w - 1 || y > 0) {
    const canRight = x < w - 1;
    const canUp = y > 0;
    let goRight = false;
    if (canRight && canUp) goRight = Math.random() < 0.5; else goRight = canRight;
    if (goRight) x++; else y--;
    path.push([x, y]);
  }
  return path;
}

function generateGrid(w: number, h: number, diff: Difficulty): { grid: Cell[][]; start: [number, number]; goal: [number, number]; optimalSteps: number } {
  const path = makeMonotonePath(w, h);
  const start: [number, number] = path[0];
  const goal: [number, number] = path[path.length - 1];

  // Базовая палитра вдоль пути: строго возрастающая светлота
  const h0 = rand(0, 360);
  const hShift = rand(-30, 30);
  const s0 = rand(0.4, 0.75);
  const l0 = rand(0.05, 0.12);
  const l1 = rand(0.88, 0.95);

  const grid: Cell[][] = Array.from({ length: h }, (_, yy) =>
    Array.from({ length: w }, (_, xx) => ({ x: xx, y: yy, h: 0, s: 0, l: 0 }))
  );

  // Назначаем цвета на пути так, чтобы соседние по пути клетки гарантированно "близки"
  path.forEach((p, i) => {
    const t = i / Math.max(1, path.length - 1);
    const hh = mod360(h0 + hShift * t + rand(-4, 4));
    const ss = clamp(s0 + rand(-0.08, 0.08), 0.25, 0.9);
    const ll = clamp(l0 + (l1 - l0) * t + rand(-0.02, 0.02), 0, 1);
    const [x, y] = p;
    grid[y][x] = { x, y, h: hh, s: ss, l: ll, onPath: true };
  });

  // Остальные клетки — декоры: иногда близкие, иногда нет
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x].onPath) continue;
      // Возьмём базу из ближайшей точки пути по манхэттену
      let nearestIdx = 0; let best = 1e9;
      for (let i = 0; i < path.length; i++) {
        const [px, py] = path[i];
        const d = Math.abs(px - x) + Math.abs(py - y);
        if (d < best) { best = d; nearestIdx = i; }
      }
      const t = nearestIdx / Math.max(1, path.length - 1);
      const baseH = grid[path[nearestIdx][1]][path[nearestIdx][0]].h;
      const baseS = grid[path[nearestIdx][1]][path[nearestIdx][0]].s;
      const baseL = grid[path[nearestIdx][1]][path[nearestIdx][0]].l;

      const noise = (k: number) => (Math.random() < 0.65 ? rand(-k, k) : rand(-k * 2, k * 2));
      const hh = mod360(baseH + noise(18));
      const ss = clamp(baseS + noise(0.18), 0.05, 0.95);
      const ll = clamp(baseL + noise(0.18), 0.02, 0.98);
      grid[y][x] = { x, y, h: hh, s: ss, l: ll };
    }
  }

  grid[start[1]][start[0]].start = true;
  grid[goal[1]][goal[0]].goal = true;

  return { grid, start, goal, optimalSteps: path.length - 1 };
}

// ─────────────────────────────────────────────────────────────────────────────
// ПРАВИЛА ХОДА
// ─────────────────────────────────────────────────────────────────────────────
function isMoveAllowed(from: Cell, to: Cell, diff: Difficulty) {
  const d = DIFFS[diff];
  const dH = hueDeltaDeg(from.h, to.h);
  const dS = Math.abs(from.s - to.s);
  const dL = to.l - from.l; // должны хотя бы не темнеть
  if (dH > d.H) return false;
  if (dS > d.S) return false;
  if (dL < (d.allowEqualL ? -0.001 : 0.001)) return false; // не темнее / строго светлее для hard
  if (dL > d.Lstep) return false; // не прыгать слишком резко по светлоте
  return true;
}

function neighbors(grid: Cell[][], x: number, y: number) {
  const res: Cell[] = [];
  if (y > 0) res.push(grid[y - 1][x]);
  if (y < grid.length - 1) res.push(grid[y + 1][x]);
  if (x > 0) res.push(grid[y][x - 1]);
  if (x < grid[0].length - 1) res.push(grid[y][x + 1]);
  return res;
}

function advicePhrase(current: Cell, target: Cell) {
  const dhSigned = signedHueDelta(current.h, target.h);
  const satDiff = target.s - current.s;
  const lightDiff = target.l - current.l;
  const parts: string[] = [];
  if (Math.abs(dhSigned) > 6) parts.push(dhSigned > 0 ? 'чуть теплее' : 'чуть холоднее');
  if (Math.abs(satDiff) > 0.05) parts.push(satDiff > 0 ? 'чуть поярче' : 'слегка приглушить');
  if (Math.abs(lightDiff) > 0.04) parts.push(lightDiff > 0 ? 'посветлее' : 'потемнее');
  if (!parts.length) return 'Почти то, что нужно — держим курс.';
  const openers = ['На глаз,', 'Мне кажется,', 'Если прищуриться,', 'Чуть-чуть бы ещё,', 'Видится,'];
  return `${openers[Math.floor(Math.random()*openers.length)]} ${parts.join(', ')}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────────────────────
export default function ColorLabyrinth() {
  const [w, setW] = useState(DEFAULT_W);
  const [h, setH] = useState(DEFAULT_H);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  const level = useMemo(() => generateGrid(w, h, difficulty), [w, h, difficulty]);
  const [grid, setGrid] = useState<Cell[][]>(level.grid);
  const [start] = useState(level.start);
  const [goal] = useState(level.goal);
  const [pos, setPos] = useState<[number, number]>(level.start);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<[number, number][]>([level.start]);
  const [won, setWon] = useState(false);
  const [tips, setTips] = useState<string[]>([
    `Клиент: нужен ${humanDesc(grid[goal[1]][goal[0]].h, grid[goal[1]][goal[0]].s, grid[goal[1]][goal[0]].l)}.`
  ]);

  // Перегенерация уровня при смене настроек
  useEffect(() => {
    const lvl = generateGrid(w, h, difficulty);
    setGrid(lvl.grid);
    setPos(lvl.start);
    setMoves(0);
    setWon(false);
    setHistory([lvl.start]);
    setTips([`Клиент: нужен ${humanDesc(lvl.grid[lvl.goal[1]][lvl.goal[0]].h, lvl.grid[lvl.goal[1]][lvl.goal[0]].s, lvl.grid[lvl.goal[1]][lvl.goal[0]].l)}.`]);
  }, [w, h, difficulty]);

  const current = grid[pos[1]][pos[0]];
  const target = grid[goal[1]][goal[0]];
  const allowed = neighbors(grid, pos[0], pos[1]).filter(c => isMoveAllowed(current, c, difficulty));

  const doMove = useCallback((c: Cell) => {
    if (won) return;
    if (!isMoveAllowed(current, c, difficulty)) return;
    setPos([c.x, c.y]);
    setMoves(m => m + 1);
    setHistory(hh => [...hh, [c.x, c.y]]);
    setTips(prev => (prev.length >= 6 ? [...prev.slice(-5), advicePhrase(c, target)] : [...prev, advicePhrase(c, target)]));
    if (c.x === goal[0] && c.y === goal[1]) setWon(true);
  }, [current, target, goal, won, difficulty]);

  const reset = useCallback(() => {
    const lvl = generateGrid(w, h, difficulty);
    setGrid(lvl.grid);
    setPos(lvl.start);
    setMoves(0);
    setWon(false);
    setHistory([lvl.start]);
    setTips([`Клиент: нужен ${humanDesc(lvl.grid[lvl.goal[1]][lvl.goal[0]].h, lvl.grid[lvl.goal[1]][lvl.goal[0]].s, lvl.grid[lvl.goal[1]][lvl.goal[0]].l)}.`]);
  }, [w, h, difficulty]);

  // Клавиши-стрелки
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (won) return;
      const map: Record<string, [number, number]> = { ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0] };
      const d = map[e.key];
      if (!d) return;
      const [nx, ny] = [pos[0] + d[0], pos[1] + d[1]];
      if (nx < 0 || ny < 0 || ny >= grid.length || nx >= grid[0].length) return;
      const to = grid[ny][nx];
      if (isMoveAllowed(current, to, difficulty)) doMove(to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pos, grid, current, difficulty, doMove, won]);

  // Вёрстка
  return (
    <main className="min-h-dvh relative text-neutral-100">
      {/* Фон-фото мастерской (положите изображение в /public/images/atelier.jpg) */}
      <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/images/atelier.jpg')" }} />
      <div className="absolute inset-0 -z-10 bg-black/70 backdrop-blur-[2px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Шапка */}
        <header className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
              🎨 Цветовой лабиринт
            </h1>
            <p className="text-neutral-300 text-sm sm:text-base">Двигайся от более тёмных оттенков к самым светлым. Ходы — только по близким цветам.</p>
          </div>
          <div className="flex items-end gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur text-sm">
              <div className="text-neutral-300 text-xs">Ходы</div>
              <div className="font-semibold text-lg">{moves}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur text-sm">
              <div className="text-neutral-300 text-xs">Сложность</div>
              <select className="bg-transparent text-neutral-100 text-sm focus:outline-none" value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}>
                <option value="easy">Лёгкая</option>
                <option value="normal">Норма</option>
                <option value="hard">Сложная</option>
              </select>
            </div>
            <button onClick={reset} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm">Новый уровень</button>
          </div>
        </header>

        {/* Верхняя панель: референс и текущий цвет + подсказки */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start mb-4 sm:mb-6">
          {/* Референс (цель) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="text-sm font-medium mb-2">Цель</div>
            <div className="w-full h-32 sm:h-36 rounded-xl border border-white/10 shadow-inner" style={{ background: hslCss(target.h, target.s, target.l) }} />
            <div className="mt-2 text-sm">
              <div className="text-neutral-300">По‑человечески:</div>
              <div className="font-medium">{humanDesc(target.h, target.s, target.l)}</div>
            </div>
          </div>

          {/* Текущий цвет */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="text-sm font-medium mb-2">Текущий</div>
            <div className={`w-full h-32 sm:h-36 rounded-xl border ${won ? 'border-emerald-400/70' : 'border-white/10'} shadow-lg transition-all`} style={{ background: hslCss(current.h, current.s, current.l) }} />
            <div className="mt-2 text-sm">
              <div className="text-neutral-300">По‑человечески:</div>
              <div className="font-medium">{humanDesc(current.h, current.s, current.l)}</div>
            </div>
          </div>

          {/* Подсказки */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="text-sm font-medium mb-2">Комментарий мастера</div>
            <div className="space-y-2 max-h-40 sm:max-h-48 overflow-auto pr-1">
              {tips.map((t, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">{t}</div>
              ))}
            </div>
            {won && <div className="mt-2 text-emerald-300 text-sm font-medium">Идеально! Маршрут найден.</div>}
          </div>
        </section>

        {/* Игровая сетка */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-neutral-300">Разрешённые ходы подсвечены рамкой.</div>
            <div className="text-xs text-neutral-400">Совет: используйте стрелки на клавиатуре.</div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: `repeat(${grid[0].length}, minmax(0, 1fr))`, gap: '6px' }}>
            {grid.map((row, yy) => row.map((c) => {
              const isHere = pos[0] === c.x && pos[1] === c.y;
              const isGoal = goal[0] === c.x && goal[1] === c.y;
              const isAllowed = allowed.some(a => a.x === c.x && a.y === c.y);
              const visited = history.some(([hx, hy]) => hx === c.x && hy === c.y);
              return (
                <button
                  key={`${c.x}-${c.y}`}
                  onClick={() => doMove(c)}
                  className={`relative aspect-square rounded-md border shadow-sm focus:outline-none transition-transform ${
                    isHere ? 'ring-2 ring-white/70 scale-95' : ''
                  } ${
                    isAllowed ? 'border-amber-300/60' : 'border-white/10'
                  } ${
                    visited ? 'opacity-95' : 'opacity-95'
                  }`}
                  style={{ background: hslCss(c.h, c.s, c.l) }}
                  aria-label={`cell-${c.x}-${c.y}`}
                >
                  {isGoal && (
                    <span className="absolute inset-1 rounded-sm border-2 border-emerald-400/80 pointer-events-none" />
                  )}
                </button>
              );
            }))}
          </div>
        </section>

        {/* Нижняя панель действий */}
        <section className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={reset} className="px-3 py-2 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 text-sm">Сгенерировать заново</button>
          <div className="text-sm text-neutral-300">Размер: 
            <select className="ml-2 bg-transparent border border-white/10 rounded-md px-2 py-1" value={`${w}x${h}`} onChange={(e) => { const [nw, nh] = e.target.value.split('x').map(Number); setW(nw); setH(nh); }}>
              <option value="10x10">10×10</option>
              <option value="12x12">12×12</option>
              <option value="14x14">14×14</option>
            </select>
          </div>
          <div className="ml-auto text-sm text-neutral-400">Цель: дойти до самой светлой клетки. Сложность влияет на близость по цвету и допустимый шаг по светлоте.</div>
        </section>
      </div>
    </main>
  );
}
