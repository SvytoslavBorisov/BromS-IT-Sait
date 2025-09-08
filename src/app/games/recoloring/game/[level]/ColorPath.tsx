"use client";

import React, { useMemo, useRef, useState } from "react";

/** ===== Типы ===== */
type Primary = "R" | "Y" | "B";            // базовые
type Mixed   = "O" | "G" | "P";            // вторичные: O=R+Y, G=Y+B, P=R+B
type Color   = Primary | Mixed;
type Dir     = "N" | "S" | "E" | "W";
type XY      = { x: number; y: number };

type Level = {
  size: number; // 10
  endpoints: Record<Primary, [XY, XY]>;
  mixTargets: Array<{ pos: XY; need: Mixed }>;
};

type Cell = {
  pipes: Record<Primary, Set<Dir>>; // “трубки” для каждого базового цвета
};

const GRID = 10;

/** ===== Палитра ===== */
const COLOR_HEX: Record<Color, string> = {
  R: "#ef4444", // red-500
  Y: "#eab308", // yellow-500
  B: "#3b82f6", // blue-500
  O: "#f97316", // orange-500
  G: "#22c55e", // green-500
  P: "#a855f7", // purple-500
};

/** ===== Вспомогалки ===== */
const keyXY = (p: XY) => `${p.x},${p.y}`;
const eqXY = (a: XY, b: XY) => a.x === b.x && a.y === b.y;
const inBounds = (p: XY) => p.x >= 0 && p.x < GRID && p.y >= 0 && p.y < GRID;

const dirFromTo = (a: XY, b: XY): Dir | null => {
  if (a.x === b.x && a.y === b.y - 1) return "S";
  if (a.x === b.x && a.y === b.y + 1) return "N";
  if (a.y === b.y && a.x === b.x - 1) return "E";
  if (a.y === b.y && a.x === b.x + 1) return "W";
  return null;
};
const step = (p: XY, d: Dir): XY =>
  d === "N" ? { x: p.x, y: p.y - 1 }
: d === "S" ? { x: p.x, y: p.y + 1 }
: d === "E" ? { x: p.x + 1, y: p.y }
: { x: p.x - 1, y: p.y };
const opposite: Record<Dir, Dir> = { N: "S", S: "N", E: "W", W: "E" };

/** ===== Смешение ===== */
const fromPrimaries = (arr: Primary[]): Color | null => {
  const s = [...new Set(arr)].sort().join("");
  if (s === "R") return "R";
  if (s === "Y") return "Y";
  if (s === "B") return "B";
  if (s === "RY") return "O";
  if (s === "BY") return "G";
  if (s === "BR") return "P";
  if (s === "YR") return "O";
  if (s === "YB") return "G";
  if (s === "RB") return "P";
  return null; // любые 3 базовых — запрещено
};

/** ===== Уровень-пример ===== */
const LEVEL_1: Level = {
  size: GRID,
  endpoints: {
    R: [{ x: 1, y: 1 }, { x: 8, y: 8 }],
    Y: [{ x: 1, y: 8 }, { x: 8, y: 1 }],
    B: [{ x: 1, y: 5 }, { x: 8, y: 5 }],
  },
  mixTargets: [
    { pos: { x: 5, y: 5 }, need: "P" }, // R+B
    { pos: { x: 3, y: 6 }, need: "O" }, // R+Y
    { pos: { x: 6, y: 4 }, need: "G" }, // Y+B
  ],
};

/** ===== Инициализация сетки ===== */
const emptyGrid = (): Cell[][] =>
  Array.from({ length: GRID }, () =>
    Array.from({ length: GRID }, () => ({
      pipes: { R: new Set<Dir>(), Y: new Set<Dir>(), B: new Set<Dir>() },
    }))
  );

/** ===== Компонент ===== */
export default function ColorMixConnect() {
  const level = LEVEL_1;
  const [grid, setGrid] = useState<Cell[][]>(() => emptyGrid());
  const [active, setActive] = useState<{ color: Primary; chain: XY[] } | null>(null);
  const [solved, setSolved] = useState<Record<Primary, boolean>>({ R: false, Y: false, B: false });
  const [message, setMessage] = useState<string>("Соедини пары R/Y/B. В пунктирах добейся нужного смешанного цвета.");
  const [uiScale, setUiScale] = useState<number>(1); // для mobile zoom подсказки

  const pressed = useRef(false);
  const boardRef = useRef<HTMLDivElement | null>(null);

  // Карты быстрых проверок
  const epMap = useMemo(() => {
    const m = new Map<string, { color: Primary; which: 0 | 1 }>();
    (["R", "Y", "B"] as Primary[]).forEach((c) => {
      m.set(keyXY(level.endpoints[c][0]), { color: c, which: 0 });
      m.set(keyXY(level.endpoints[c][1]), { color: c, which: 1 });
    });
    return m;
  }, [level.endpoints]);

  const targetMap = useMemo(() => {
    const m = new Map<string, Mixed>();
    level.mixTargets.forEach((t) => m.set(keyXY(t.pos), t.need));
    return m;
  }, [level.mixTargets]);

  /** ==== Вибро-обратная связь (если есть) ==== */
  const buzz = (ms = 25) => {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        // @ts-ignore
        navigator.vibrate(ms);
      }
    } catch {}
  };

  /** ==== Подсчёт базовых цветов в клетке ==== */
  const primariesAt = (g: Cell[][], p: XY): Primary[] => {
    const res: Primary[] = [];
    (["R", "Y", "B"] as Primary[]).forEach((c) => {
      if (g[p.y][p.x].pipes[c].size > 0) res.push(c);
    });
    return res;
  };

  const mixedAt = (g: Cell[][], p: XY): Mixed | null => {
    const prs = primariesAt(g, p);
    if (prs.length !== 2) return null;
    const c = fromPrimaries(prs);
    return (c === "O" || c === "G" || c === "P") ? c : null;
  };

  /** ==== Очистка одного цвета ==== */
  const clearColor = (c: Primary) => {
    setGrid((g) =>
      g.map((row) =>
        row.map((cell) => ({
          pipes: {
            R: c === "R" ? new Set<Dir>() : new Set(cell.pipes.R),
            Y: c === "Y" ? new Set<Dir>() : new Set(cell.pipes.Y),
            B: c === "B" ? new Set<Dir>() : new Set(cell.pipes.B),
          },
        }))
      )
    );
    setSolved((s) => ({ ...s, [c]: false }));
  };

  /** ==== Сброс ==== */
  const resetAll = () => {
    setGrid(emptyGrid());
    setSolved({ R: false, Y: false, B: false });
    setActive(null);
    setMessage("Сброс. Соедини R/Y/B и добейся нужного смешения в целях.");
  };

  /** ==== Мобильный старт: тапаем по эндпоинту или выбираем цвет-кнопку ==== */
  const startAt = (p: XY) => {
    const tag = epMap.get(keyXY(p));
    if (!tag) return; // старт только с «свой» круг
    // перезапускаем трассу цвета
    clearColor(tag.color);
    setActive({ color: tag.color, chain: [p] });
  };

  /** ==== Проверки перед добавлением сегмента ==== */
  const canAddSegment = (g: Cell[][], from: XY, to: XY, color: Primary): [boolean, string?] => {
    if (!inBounds(to)) return [false, "Вне поля"];
    const d = dirFromTo(from, to);
    if (!d) return [false, "Ход только по соседним клеткам"];

    const toKey = keyXY(to);

    // Нельзя заполнять чужой эндпоинт
    const tag = epMap.get(toKey);
    if (tag && tag.color !== color) {
      return [false, "Нельзя заходить на чужой эндпоинт"];
    }

    // Запрещаем тройное смешение: если в целевой клетке уже 2 базовых и это не наш цвет → нельзя
    const prs = primariesAt(g, to);
    const presentSet = new Set(prs);
    presentSet.add(color);
    if (presentSet.size > 2) {
      return [false, "Нельзя смешивать три базовых цвета в одной клетке"];
    }

    // Степени для трубок (чтобы не было разветвлений)
    const degFrom = g[from.y][from.x].pipes[color].size + 1;
    const degTo = g[to.y][to.x].pipes[color].size + 1;
    if (degFrom > 2 || degTo > 2) {
      return [false, "Разветвления недопустимы"];
    }

    return [true];
  };

  /** ==== Шаг рисования ==== */
  const stepTo = (to: XY) => {
    setActive((st) => {
      if (!st) return st;
      const from = st.chain[st.chain.length - 1];
      const color = st.color;
      if (!from) return st;

      setGrid((g) => {
        const [ok, reason] = canAddSegment(g, from, to, color);
        if (!ok) {
          buzz(15);
          if (reason) setMessage(reason);
          return g;
        }
        const copy = g.map((row) =>
          row.map((cell) => ({
            pipes: {
              R: new Set(cell.pipes.R),
              Y: new Set(cell.pipes.Y),
              B: new Set(cell.pipes.B),
            },
          }))
        );
        const d = dirFromTo(from, to)!;
        copy[from.y][from.x].pipes[color].add(d);
        copy[to.y][to.x].pipes[color].add(opposite[d]);
        return copy;
      });

      return { ...st, chain: [...st.chain, to] };
    });
  };

  /** ==== Завершение рисования ==== */
  const endDraw = () => {
    if (!active) return;
    const c = active.color;
    setActive(null);

    // Проверка пары
    const ok = isPairSolved(grid, level.endpoints[c][0], level.endpoints[c][1], c);
    if (ok) {
      setSolved((s) => ({ ...s, [c]: true }));
      setMessage(`Цвет ${c}: пара соединена.`);
    } else {
      setMessage("Трасса не соединяет пару или имеет разрывы.");
    }
  };

  /** ==== Все цели смешения выполнены? ==== */
  const allTargetsOk = level.mixTargets.every((t) => mixedAt(grid, t.pos) === t.need);
  const allSolved = solved.R && solved.Y && solved.B && allTargetsOk;

  /** ==== Обработчики pointer для мобильных ==== */
  const onBoardPointerUp = () => {
    if (!pressed.current) return;
    pressed.current = false;
    endDraw();
    // вернуть прокрутку на странице
    if (boardRef.current) boardRef.current.style.touchAction = "auto";
  };

  const onCellPointerDown = (x: number, y: number) => {
    pressed.current = true;
    // запрещаем скролл во время рисования (мобилки)
    if (boardRef.current) boardRef.current.style.touchAction = "none";
    startAt({ x, y });
  };

  const onCellPointerMove = (x: number, y: number) => {
    if (!pressed.current || !active) return;
    const last = active.chain[active.chain.length - 1];
    const cand = { x, y };
    if (dirFromTo(last, cand)) stepTo(cand);
  };

  /** ==== РЕНДЕР ==== */
  return (
    <div className="mx-auto max-w-[820px] p-4 select-none">
      <h1 className="text-2xl font-semibold mb-2">Color Mix Connect — 10×10</h1>

      {/* MOBILE UI: крупные кнопки, подсветка активного цвета */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {(["R", "Y", "B"] as Primary[]).map((c) => (
          <button
            key={c}
            onClick={() => clearColor(c)}
            className="px-4 py-2 rounded-xl text-white text-base active:scale-[0.98]"
            style={{ background: COLOR_HEX[c], outline: active?.color === c ? "3px solid #00000020" : "none" }}
            title={`Очистить ${c}`}
          >
            Очистить {c} {solved[c] ? "✓" : ""}
          </button>
        ))}
        <button
          onClick={resetAll}
          className="px-4 py-2 rounded-xl border text-base active:scale-[0.98]"
          title="Сбросить всё"
        >
          Сброс
        </button>

        {/* Масштаб под мобильные (увеличение клетки) */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-neutral-500">Размер</span>
          <input
            type="range"
            min={0.9}
            max={1.3}
            step={0.05}
            value={uiScale}
            onChange={(e) => setUiScale(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <p className="text-sm text-neutral-600 mb-3">{message}</p>

      <Board
        ref={boardRef}
        grid={grid}
        endpoints={level.endpoints}
        mixTargets={level.mixTargets}
        onCellPointerDown={onCellPointerDown}
        onCellPointerMove={onCellPointerMove}
        onBoardPointerUp={onBoardPointerUp}
        uiScale={uiScale}
      />

      <div className="mt-3 text-sm">
        <p><b>Смешение</b>: R+Y=O, Y+B=G, R+B=P. Тройного смешения нет.</p>
        <p><b>Победа</b>: соединены пары R/Y/B и все пунктирные клетки имеют нужный смешанный цвет.</p>
      </div>

      {allSolved && (
        <div className="mt-4 p-3 rounded-xl border bg-green-50 text-green-800">
          Уровень пройден! 🎉
        </div>
      )}
    </div>
  );
}

/** ===== Проверка трассы цвета: строгая, без разветвлений ===== */
function isPairSolved(grid: Cell[][], a: XY, b: XY, color: Primary): boolean {
  const deg = (p: XY) => grid[p.y][p.x].pipes[color].size;
  if (deg(a) !== 1 || deg(b) !== 1) return false;

  const visited = new Set<string>();
  let cur = a;
  let prev: XY | null = null;

  for (let steps = 0; steps < GRID * GRID; steps++) {
    visited.add(keyXY(cur));
    if (eqXY(cur, b)) break;

    const dirs = [...grid[cur.y][cur.x].pipes[color]];
    let next: XY | null = null;
    for (const d of dirs) {
      const n = step(cur, d);
      if (!prev || !eqXY(n, prev)) {
        next = n;
        break;
      }
    }
    if (!next) return false;

    const d = dirFromTo(cur, next)!;
    const back = opposite[d];
    if (!grid[next.y][next.x].pipes[color].has(back)) return false;

    prev = cur;
    cur = next;
  }

  // никаких “хвостов”: степень 1 только у двух концов
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const d = grid[y][x].pipes[color].size;
      if (d > 2) return false;
      if (d === 1 && !eqXY({ x, y }, a) && !eqXY({ x, y }, b)) return false;
    }
  }
  return true;
}

/** ===== Отрисовка доски (адаптировано под мобильные) ===== */
const Board = React.forwardRef(function Board(
  props: {
    grid: Cell[][];
    endpoints: Record<Primary, [XY, XY]>;
    mixTargets: Array<{ pos: XY; need: Mixed }>;
    onCellPointerDown: (x: number, y: number) => void;
    onCellPointerMove: (x: number, y: number) => void;
    onBoardPointerUp: () => void;
    uiScale: number;
  },
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const { grid, endpoints, mixTargets, onCellPointerDown, onCellPointerMove, onBoardPointerUp, uiScale } = props;

  const epSet = useMemo(() => {
    const m = new Map<string, { color: Primary }>();
    (["R", "Y", "B"] as Primary[]).forEach((c) => {
      m.set(keyXY(endpoints[c][0]), { color: c });
      m.set(keyXY(endpoints[c][1]), { color: c });
    });
    return m;
  }, [endpoints]);

  const targets = useMemo(() => {
    const m = new Map<string, Mixed>();
    mixTargets.forEach((t) => m.set(keyXY(t.pos), t.need));
    return m;
  }, [mixTargets]);

  // базовый размер клетки: увеличен для телефонов
  const cellGap = 3;
  const baseSize = 720; // px
  const boardPx = Math.min(0.95 * window.innerWidth, baseSize) * uiScale;

  return (
    <div
      ref={ref}
      className="relative border rounded-2xl p-3 bg-white shadow-sm"
      onPointerUp={onBoardPointerUp}
      onPointerCancel={onBoardPointerUp}
      style={{ touchAction: "auto" }} // во время рисования переключаем на "none"
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${GRID}, 1fr)`,
          gridTemplateRows: `repeat(${GRID}, 1fr)`,
          gap: cellGap,
          width: `${boardPx}px`,
          aspectRatio: "1 / 1",
          margin: "0 auto",
        }}
      >
        {Array.from({ length: GRID * GRID }, (_, i) => {
          const x = i % GRID;
          const y = Math.floor(i / GRID);
          const cell = grid[y][x];
          const ep = epSet.get(`${x},${y}`);
          const target = targets.get(`${x},${y}`);

          // какие базовые присутствуют (для индикатора смешения)
          const present: Primary[] = (["R", "Y", "B"] as Primary[]).filter(
            (c) => cell.pipes[c].size > 0
          );
          const mixColor = present.length === 2 ? (fromPrimaries(present) as Mixed) : null;

          return (
            <div
              key={i}
              className="relative bg-neutral-50 rounded-xl border border-neutral-200"
              onPointerDown={() => onCellPointerDown(x, y)}
              onPointerMove={(e) => {
                // игнорируем hover мыши без зажатия, но на мобиле даёт стабильный drag
                if (e.buttons !== 1 && e.pointerType !== "touch") return;
                onCellPointerMove(x, y);
              }}
              style={{
                // крупные тач-мишени
                minWidth: 0,
              }}
            >
              {/* трубки для каждого цвета */}
              {(["R", "Y", "B"] as Primary[]).map((c) => {
                if (cell.pipes[c].size === 0) return null;
                const dirs = [...cell.pipes[c]];
                return (
                  <React.Fragment key={c}>
                    {/* центр узла */}
                    <div
                      className="absolute rounded-full"
                      style={{
                        width: 12,
                        height: 12,
                        left: "calc(50% - 6px)",
                        top: "calc(50% - 6px)",
                        background: COLOR_HEX[c],
                      }}
                    />
                    {/* сегменты */}
                    {dirs.map((d, idx) => (
                      <div
                        key={`${c}-${d}-${idx}`}
                        className="absolute"
                        style={{
                          background: COLOR_HEX[c],
                          ...(d === "N" && {
                            left: "calc(50% - 4px)",
                            top: 0,
                            width: 8,
                            height: "50%",
                          }),
                          ...(d === "S" && {
                            left: "calc(50% - 4px)",
                            bottom: 0,
                            width: 8,
                            height: "50%",
                          }),
                          ...(d === "E" && {
                            top: "calc(50% - 4px)",
                            right: 0,
                            height: 8,
                            width: "50%",
                          }),
                          ...(d === "W" && {
                            top: "calc(50% - 4px)",
                            left: 0,
                            height: 8,
                            width: "50%",
                          }),
                          borderRadius: 4,
                        }}
                      />
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Индикатор смешения по центру — устойчивый, не мерцает */}
              {mixColor && (
                <div
                  className="absolute rounded-full border-2 border-white shadow"
                  style={{
                    width: 18,
                    height: 18,
                    left: "calc(50% - 9px)",
                    top: "calc(50% - 9px)",
                    background: COLOR_HEX[mixColor],
                  }}
                />
              )}

              {/* Эндпоинты */}
              {ep && (
                <div
                  className="absolute rounded-full ring-2 ring-white shadow"
                  style={{
                    width: 22,
                    height: 22,
                    left: "calc(50% - 11px)",
                    top: "calc(50% - 11px)",
                    background: COLOR_HEX[ep.color],
                  }}
                />
              )}

              {/* Цели смешения */}
              {target && (
                <div
                  className="absolute rounded-lg"
                  style={{ inset: 3, border: `2px dashed ${COLOR_HEX[target]}` }}
                  title={`Нужен цвет ${target}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Легенда целей — крупнее, удобнее тапать */}
      <div className="flex flex-wrap gap-3 justify-center mt-3 text-sm">
        {mixTargets.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded" style={{ background: COLOR_HEX[t.need] }} />
            ({t.pos.x + 1},{t.pos.y + 1}) — {t.need}
          </span>
        ))}
      </div>
    </div>
  );
});
