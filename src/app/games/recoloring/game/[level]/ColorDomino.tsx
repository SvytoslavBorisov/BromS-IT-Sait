"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Wand2, Undo2, RotateCcw, Shuffle, Swords, Trophy, Skull, Info, Sparkles, RefreshCw, ArrowLeftRight } from "lucide-react";

/** ───────────────────────────────────────────────────────────────────────────
 * ЦВЕТОВОЕ ДОМИНО — PvE, красивые фишки (две половинки), поле «сукно»
 * ---------------------------------------------------------------------------
 * • Фишки: две половинки (a и b) с разным HSL.
 * • Совпадение: по HUE — половинка к открытому концу цепочки (левый/правый).
 * • Можно переворачивать фишку (менять местами половинки).
 * • Очки: базовые + бонус за близость; финал по окончанию колоды/рук.
 * • ИИ: выбирает лучшую сторону и ориентацию, берёт из колоды если нет хода.
 * • Поле: зелёное «сукно», деревянная рама, аккуратные тени, зигзаг-укладка.
 * --------------------------------------------------------------------------*/

/* ───────────────────────── Утилиты цвета ───────────────────────── */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mod360 = (x: number) => ((x % 360) + 360) % 360;
const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
const hueDeltaDeg = (a: number, b: number) => {
  const d = Math.abs(mod360(a) - mod360(b)) % 360;
  return d > 180 ? 360 - d : d;
};
const signedHueDelta = (from: number, to: number) => ((to - from + 540) % 360) - 180;

/* «по-человечески» */
function hueName(h: number) {
  const ranges: Array<[number, string]> = [
    [0, "алый"], [15, "красно-оранжевый"], [30, "оранжевый"], [45, "янтарный"],
    [60, "жёлтый"], [90, "лаймовый"], [120, "зелёный"], [150, "бирюзоватый"],
    [180, "бирюзовый"], [210, "лазурный"], [240, "синий"], [270, "фиолетовый"],
    [300, "пурпурный"], [330, "малиновый"], [360, "алый"],
  ];
  const x = mod360(h);
  let last = ranges[0][1];
  for (const [deg, name] of ranges) if (x >= deg) last = name;
  return last;
}

/* ───────────────────────── Типы и параметры ─────────────────────── */
type Half = { h: number; s: number; l: number };
type Tile = { id: number; a: Half; b: Half; joker?: boolean }; // joker подойдёт куда угодно

type Difficulty = "easy" | "normal" | "hard";
const HUE_THRESH: Record<Difficulty, number> = { easy: 55, normal: 35, hard: 20 };

const HAND = 6;
const DECK_N = 40;
const JOKERS = 2;
const DISCARD_LIMIT = 5;

/* ───────────────────────── Генерация колоды ─────────────────────── */
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
function makeHalf(baseH: number, spread = 22): Half {
  const h = mod360(baseH + rnd(-spread, spread));
  const s = clamp(rnd(0.45, 0.9), 0.35, 0.95);
  const l = clamp(rnd(0.35, 0.7), 0.20, 0.85);
  return { h, s, l };
}
function makeDeck(): Tile[] {
  const base = rnd(0, 360);
  const step = 360 / (DECK_N - JOKERS);
  const arr: Tile[] = [];
  for (let i = 0; i < DECK_N - JOKERS; i++) {
    const h0 = mod360(base + i * step + rnd(-12, 12));
    const a = makeHalf(h0, 16);
    const b = makeHalf(h0 + rnd(-35, 35), 18); // половинки отличаются
    arr.push({ id: i + 1, a, b });
  }
  // Перемешивание Фишера–Йетса
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Вставим джокеры
  for (let j = 0; j < JOKERS; j++) arr.splice(Math.floor(Math.random() * arr.length), 0, { id: 1000 + j, a: { h: 0, s: 0, l: 0 }, b: { h: 0, s: 0, l: 0 }, joker: true });
  return arr;
}

/* ───────────────────────── Правила домино ───────────────────────── */
function canMatch(h1: number, h2: number, diff: Difficulty) {
  return hueDeltaDeg(h1, h2) <= HUE_THRESH[diff];
}
type Side = "left" | "right";
type Placement = { side: Side; flip: boolean; score: number };

function bestPlacement(tile: Tile, endLeft: number, endRight: number, diff: Difficulty): Placement | null {
  if (tile.joker) {
    // джокер — всегда можно; ближе к какому концу?
    const dL = 180 - Math.min(hueDeltaDeg(endLeft, endRight), 180);
    return { side: dL >= 0 ? "left" : "right", flip: false, score: 1 };
  }
  const opts: Placement[] = [];
  // слева: сопоставляем половинку, которая будет к открытому левому концу
  if (canMatch(tile.a.h, endLeft, diff)) opts.push({ side: "left", flip: false, score: 1 - hueDeltaDeg(tile.a.h, endLeft) / HUE_THRESH[diff] });
  if (canMatch(tile.b.h, endLeft, diff)) opts.push({ side: "left", flip: true, score: 1 - hueDeltaDeg(tile.b.h, endLeft) / HUE_THRESH[diff] });
  // справа
  if (canMatch(tile.b.h, endRight, diff)) opts.push({ side: "right", flip: false, score: 1 - hueDeltaDeg(tile.b.h, endRight) / HUE_THRESH[diff] });
  if (canMatch(tile.a.h, endRight, diff)) opts.push({ side: "right", flip: true, score: 1 - hueDeltaDeg(tile.a.h, endRight) / HUE_THRESH[diff] });
  if (!opts.length) return null;
  return opts.sort((A, B) => B.score - A.score)[0];
}

/* ───────────────────────── Вёрстка плиток ───────────────────────── */
function DominoTile({
  tile, selected, onSelect, onPlaceLeft, onPlaceRight, onFlipPreview,
}: {
  tile: Tile;
  selected?: boolean;
  onSelect?: () => void;
  onPlaceLeft?: () => void;
  onPlaceRight?: () => void;
  onFlipPreview?: () => void;
}) {
  const isJ = tile.joker;
  return (
    <div className={`rounded-2xl border p-2 bg-white/5 border-white/10 ${selected ? "outline outline-2 outline-amber-300/70" : ""}`}>
      <div className="relative w-24 h-36 rounded-xl overflow-hidden border border-white/10 shadow-md mx-auto">
        <div className="absolute inset-0 grid grid-cols-2">
          <div style={{ background: isJ ? "repeating-linear-gradient(45deg,#0b0b0b 0 7px,#1a1a1a 7px 14px)" : hsl(tile.a.h, tile.a.s, tile.a.l) }} />
          <div style={{ background: isJ ? "repeating-linear-gradient(45deg,#111 0 7px,#222 7px 14px)" : hsl(tile.b.h, tile.b.s, tile.b.l) }} />
        </div>
        <div className="absolute inset-0 pointer-events-none">
          {/* разделительная полоска */}
          <div className="absolute inset-y-0 left-1/2 w-[2px] bg-black/50" />
          <div className="absolute inset-0 border border-black/40" />
          <div className="absolute inset-0 ring-1 ring-white/10 rounded-xl" />
        </div>
        {!isJ && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] bg-black/40 border border-white/10 rounded px-2 py-0.5">
            {Math.round(tile.a.h)}°/{Math.round(tile.b.h)}°
          </div>
        )}
        {isJ && <div className="absolute inset-0 flex items-center justify-center text-xl">🃏</div>}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1">
        <button onClick={onPlaceLeft} className="h-8 rounded-md border text-xs bg-emerald-600/90 hover:bg-emerald-500 border-emerald-300/40">←</button>
        <button onClick={onFlipPreview} className="h-8 rounded-md border text-xs bg-black/30 hover:bg-black/20 border-white/10">
          <ArrowLeftRight size={14} className="-mt-0.5 inline mr-1" />flip
        </button>
        <button onClick={onPlaceRight} className="h-8 rounded-md border text-xs bg-emerald-600/90 hover:bg-emerald-500 border-emerald-300/40">→</button>
      </div>
      <button onClick={onSelect} className="mt-1 w-full h-8 rounded-md border bg-black/30 hover:bg-black/20 border-white/10 text-xs">
        {selected ? "Выбрано" : "Выбрать"}
      </button>
    </div>
  );
}

/* ───────────────────────── Алгоритм раскладки на поле ─────────────
   Змейка по строкам: вмещаем по N плиток в ряд, затем перенос и инверт.
   Мы храним линейную цепочку, а координаты считаем при рендере.         */
function useSerpentineLayout(chainLen: number, perRow: number) {
  const coords = Array.from({ length: chainLen }, (_, i) => {
    const row = Math.floor(i / perRow);
    const idxInRow = i % perRow;
    const x = row % 2 === 0 ? idxInRow : perRow - 1 - idxInRow;
    const y = row;
    return { x, y };
  });
  const rows = Math.ceil(chainLen / perRow);
  return { coords, rows };
}

/* ───────────────────────── Основная игра ────────────────────────── */
export default function ColorDominoPvE() {
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [deck, setDeck] = useState<Tile[]>(() => makeDeck());
  const [player, setPlayer] = useState<Tile[]>([]);
  const [bot, setBot] = useState<Tile[]>([]);
  const [chain, setChain] = useState<Tile[]>([]);
  const [leftEnd, setLeftEnd] = useState<number>(0);
  const [rightEnd, setRightEnd] = useState<number>(0);
  const [turn, setTurn] = useState<"player" | "bot">("player");
  const [scoreP, setScoreP] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [discards, setDiscards] = useState(DISCARD_LIMIT);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState("Соберите цепочку, укладывая половинки по близости оттенка.");
  const [flipPreview, setFlipPreview] = useState<Record<number, boolean>>({});

  // init
  useEffect(() => {
    const fresh = makeDeck();
    const start = fresh.shift()!;
    const pHand = fresh.splice(0, HAND);
    const bHand = fresh.splice(0, HAND);
    setDeck(fresh);
    setChain([start]);
    setPlayer(pHand);
    setBot(bHand);
    setLeftEnd(start.a.h);  // слева — a, справа — b
    setRightEnd(start.b.h);
    setTurn("player");
    setScoreP(0); setScoreB(0); setDiscards(DISCARD_LIMIT);
    setSelected(null);
    setMessage("Ваш ход. Выберите фишку и сторону. Можно перевернуть фишку кнопкой flip.");
  }, []);

  // общие функции
  const closeness = (h1: number, h2: number) => clamp(1 - hueDeltaDeg(h1, h2) / HUE_THRESH[difficulty], 0, 1);
  const addScore = (who: "player" | "bot", tile: Tile, endHue: number) => {
    const clos = tile.joker ? 1 : Math.max(closeness(tile.a.h, endHue), closeness(tile.b.h, endHue));
    const gain = 10 + Math.round(10 * clos) + Math.floor(chain.length / 5) * 5;
    if (who === "player") setScoreP(s => s + gain); else setScoreB(s => s + gain);
  };

  const tryPlace = (who: "player" | "bot", tile: Tile, place: Placement) => {
    // учитываем flip: если flip=true, меняем a<->b перед постановкой
    const t: Tile = place.flip ? { ...tile, a: tile.b, b: tile.a } : tile;

    if (place.side === "left") {
      // сопоставили t.a с левым концом → новый левый = t.b
      setChain(c => [t, ...c]);
      setLeftEnd(t.b.h);
      addScore(who, t, leftEnd);
    } else {
      // сопоставили t.b с правым концом → новый правый = t.a
      setChain(c => [...c, t]);
      setRightEnd(t.a.h);
      addScore(who, t, rightEnd);
    }
  };

  // ход игрока
  function playSelected(side: Side) {
    if (turn !== "player" || selected == null) return;
    const tile = player.find(t => t.id === selected);
    if (!tile) return;
    const endH = side === "left" ? leftEnd : rightEnd;

    let placement = bestPlacement(tile, leftEnd, rightEnd, difficulty);
    // если выбрана сторона — принудительно
    if (placement) {
      placement = { ...placement, side };
      // если принудительная сторона запрещает — проверить flip/альтернативу
      const can =
        (side === "left" && (canMatch(tile.a.h, leftEnd, difficulty) || canMatch(tile.b.h, leftEnd, difficulty))) ||
        (side === "right" && (canMatch(tile.a.h, rightEnd, difficulty) || canMatch(tile.b.h, rightEnd, difficulty)));
      if (!can) { setMessage("Эта фишка не подходит к выбранному концу."); return; }
      // уважаем текущий flipPreview (если юзер нажимал flip)
      const wantFlip = !!flipPreview[tile.id];
      if (side === "left") {
        if (wantFlip && canMatch(tile.b.h, leftEnd, difficulty)) placement.flip = true;
        else if (!wantFlip && canMatch(tile.a.h, leftEnd, difficulty)) placement.flip = false;
      } else {
        if (wantFlip && canMatch(tile.a.h, rightEnd, difficulty)) placement.flip = true;
        else if (!wantFlip && canMatch(tile.b.h, rightEnd, difficulty)) placement.flip = false;
      }
    }

    if (!placement) { setMessage("Не подходит по оттенку."); return; }

    tryPlace("player", tile, placement);
    setPlayer(h => h.filter(x => x.id !== tile.id));
    setSelected(null);
    setFlipPreview(fp => ({ ...fp, [tile.id]: false }));

    // добор
    if (deck.length) { setPlayer(h => [...h, deck[0]]); setDeck(d => d.slice(1)); }

    setTurn("bot");
    setMessage("Ход компьютера…");
    setTimeout(botMove, 550);
  }

  // сброс игрока
  function discardSelected() {
    if (turn !== "player" || selected == null) return;
    if (!discards) { setMessage("Лимит сбросов исчерпан."); return; }
    const tile = player.find(t => t.id === selected)!;
    setPlayer(h => h.filter(x => x.id !== tile.id));
    setDiscards(n => n - 1);
    setScoreP(s => Math.max(0, s - 3));
    // вниз колоды → и вытянуть новую
    setDeck(d => [...d, tile]);
    if (deck.length) { setPlayer(h => [...h, deck[0]]); setDeck(d => d.slice(1)); }
    setSelected(null);
    setMessage("Сбросили фишку (−3). Ваш ход.");
  }

  // ход бота
  function botMove() {
    if (turn !== "bot") return;
    // поиск лучшего варианта
    let best: { tile: Tile; place: Placement } | null = null;
    for (const t of bot) {
      const p = bestPlacement(t, leftEnd, rightEnd, difficulty);
      if (p && (!best || p.score > best.place.score)) best = { tile: t, place: p };
    }
    if (!best) {
      // добор, если есть
      if (deck.length) {
        const top = deck[0];
        setBot(b => [...b, top]);
        setDeck(d => d.slice(1));
        setMessage("Компьютер взял фишку из колоды.");
        setTimeout(botMove, 500);
        return;
      } else {
        // пас
        setMessage("Компьютер пасует. Ваш ход.");
        setTurn("player");
        return;
      }
    }
    tryPlace("bot", best.tile, best.place);
    setBot(b => b.filter(x => x.id !== best!.tile.id));

    // добор
    if (deck.length) { setBot(b => [...b, deck[0]]); setDeck(d => d.slice(1)); }

    // победные условия
    if (bot.length - 1 === 0) { setMessage("Компьютер уложил все фишки."); return; }

    setTurn("player");
    const sideWord = best.place.side === "left" ? "слева" : "справа";
    const flipWord = best.place.flip ? " (перевёрнута)" : "";
    setMessage(`Компьютер кладёт ${best.tile.joker ? "джокер" : `${hueName(best.tile.a.h)}|${hueName(best.tile.b.h)}`} ${sideWord}${flipWord}. Ваш ход.`);
  }

  // завершение партии
  const gameOver = useMemo(() => {
    const playerMoves = player.some(t => !!bestPlacement(t, leftEnd, rightEnd, difficulty));
    const botMoves = bot.some(t => !!bestPlacement(t, leftEnd, rightEnd, difficulty));
    const noDeck = deck.length === 0;
    const playerEmpty = player.length === 0;
    const botEmpty = bot.length === 0;
    if (playerEmpty || botEmpty) return true;
    if (noDeck && !playerMoves && !botMoves) return true;
    return false;
  }, [player, bot, deck, leftEnd, rightEnd, difficulty]);

  // перезапуск
  function resetAll() {
    const fresh = makeDeck();
    const start = fresh.shift()!;
    const pHand = fresh.splice(0, HAND);
    const bHand = fresh.splice(0, HAND);
    setDeck(fresh);
    setChain([start]);
    setPlayer(pHand);
    setBot(bHand);
    setLeftEnd(start.a.h);
    setRightEnd(start.b.h);
    setTurn("player");
    setScoreP(0); setScoreB(0); setDiscards(DISCARD_LIMIT);
    setSelected(null);
    setFlipPreview({});
    setMessage("Новая партия. Ваш ход.");
  }

  // левый/правый край цепочки — для подсказок/оценки
  const advice = useMemo(() => {
    if (!player.length) return "";
    let best: { tile: Tile; place: Placement } | null = null;
    for (const t of player) {
      const p = bestPlacement(t, leftEnd, rightEnd, difficulty);
      if (p && (!best || p.score > best.place.score)) best = { tile: t, place: p };
    }
    if (!best) return "Похоже, ничего не подходит — попробуйте сброс или ждите добора.";
    const dh = best.place.side === "left"
      ? (best.place.flip ? hueDeltaDeg(best.tile.b.h, leftEnd) : hueDeltaDeg(best.tile.a.h, leftEnd))
      : (best.place.flip ? hueDeltaDeg(best.tile.a.h, rightEnd) : hueDeltaDeg(best.tile.b.h, rightEnd));
    return `Подсказка: ${best.tile.joker ? "джокер" : `${hueName(best.tile.a.h)}|${hueName(best.tile.b.h)}`} ${best.place.side === "left" ? "слева" : "справа"} — ΔH≈${Math.round(dh)}°.`;
  }, [player, leftEnd, rightEnd, difficulty]);

  // красивый борд: «сукно» с деревянной рамой
  const boardRef = useRef<HTMLDivElement>(null);
  const PER_ROW = 10; // плиток на ряд
  const { coords, rows } = useSerpentineLayout(chain.length, PER_ROW);

  /* ───────────────────────── UI ───────────────────────── */
  return (
    <main className="min-h-dvh relative text-neutral-100">
      {/* общий фон мастерской под гейм-бордом */}
      <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/images/atelier.jpg')" }} />
      <div className="absolute inset-0 -z-10 bg-black/70 backdrop-blur-[2px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Шапка */}
        <header className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Swords className="opacity-80" /> Цветовое домино — игрок vs компьютер
            </h1>
            <p className="text-neutral-300 text-sm sm:text-base">
              Кладите фишки, чтобы оттенок <b>половинки</b> был близок к открытому концу. Можно класть <b>слева</b> или <b>справа</b> и <b>переворачивать</b> фишку.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur text-sm"><div className="text-neutral-300 text-xs">Очки (вы)</div><div className="font-semibold text-lg">{scoreP}</div></div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur text-sm"><div className="text-neutral-300 text-xs">Очки (бот)</div><div className="font-semibold text-lg">{scoreB}</div></div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur text-sm">
              <div className="text-neutral-300 text-xs">Сложность</div>
              <select className="bg-transparent text-neutral-100 text-sm focus:outline-none" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                <option value="easy">Лёгкая</option>
                <option value="normal">Норма</option>
                <option value="hard">Сложная</option>
              </select>
            </div>
            <button onClick={resetAll} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm"><RotateCcw size={16} className="inline -mt-0.5 mr-1" /> Новая партия</button>
          </div>
        </header>

        {/* Сообщения */}
        <section className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-start gap-2">
            <Info size={18} className="opacity-80 mt-1" />
            <div className="flex-1">
              <div className="font-medium text-sm sm:text-base">{message}</div>
              <div className="text-neutral-300 text-xs sm:text-sm mt-1">
                <Wand2 size={14} className="inline -mt-1 mr-1" />
                {advice}
              </div>
            </div>
            <div className={`text-xs px-2 py-1 rounded ${turn === "player" ? "bg-emerald-500/20 border border-emerald-300/40" : "bg-amber-500/20 border border-amber-300/40"}`}>
              Ход: {turn === "player" ? "Вы" : "Компьютер"}
            </div>
          </div>
        </section>

        {/* Игровое поле — «сукно» с рамой */}
        <section className="mb-4">
          <div
            ref={boardRef}
            className="relative mx-auto rounded-[22px] p-4 md:p-6"
            style={{
              maxWidth: 980,
              background: "linear-gradient(135deg,#3a2a13,#5a3f1a)",
              boxShadow: "inset 0 0 0 2px rgba(0,0,0,0.35), 0 10px 30px rgba(0,0,0,0.35)"
            }}
          >
            <div
              className="rounded-[14px] p-3 md:p-4 border"
              style={{
                background:
                  "radial-gradient(120% 120% at 30% 20%, rgba(255,255,255,0.12), transparent 60%), radial-gradient(120% 120% at 80% 0%, rgba(255,255,255,0.08), transparent 60%), #0f3d27",
                borderColor: "rgba(255,255,255,0.12)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 2px 12px rgba(0,0,0,0.6)",
              }}
            >
              {/* панель концов */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-neutral-200">
                  Левый конец: <b>{Math.round(leftEnd)}°</b>
                </div>
                <div className="text-sm text-neutral-200">
                  Правый конец: <b>{Math.round(rightEnd)}°</b>
                </div>
              </div>

              {/* сетка-змейка */}
              <div
                className="relative mx-auto"
                style={{
                  width: "100%",
                  minHeight: 140 + rows * 62,
                }}
              >
                {/* клетки-сетки (легкая фактура) */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${10}, 1fr)` }}>
                    {Array.from({ length: 10 * Math.max(3, rows) }).map((_, i) => (
                      <div key={i} className="border border-black/20" />
                    ))}
                  </div>
                </div>

                {/* сами фишки */}
                {chain.map((t, i) => {
                  const c = coords[i];
                  const left = `calc(${(c.x / 10) * 100}% + 6px)`;
                  const top = 12 + c.y * 62;
                  return (
                    <div
                      key={i}
                      className="absolute w-24 h-36 rounded-xl overflow-hidden border border-white/10 shadow-[0_8px_18px_rgba(0,0,0,0.4)]"
                      style={{ left, top }}
                      title={t.joker ? "Джокер" : `${hueName(t.a.h)} | ${hueName(t.b.h)}`}
                    >
                      <div className="absolute inset-0 grid grid-cols-2">
                        <div style={{ background: t.joker ? "repeating-linear-gradient(45deg,#0b0b0b 0 7px,#1a1a1a 7px 14px)" : hsl(t.a.h, t.a.s, t.a.l) }} />
                        <div style={{ background: t.joker ? "repeating-linear-gradient(45deg,#111 0 7px,#222 7px 14px)" : hsl(t.b.h, t.b.s, t.b.l) }} />
                      </div>
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-y-0 left-1/2 w-[2px] bg-black/60" />
                        <div className="absolute inset-0 border border-black/40" />
                        <div className="absolute inset-0 ring-1 ring-white/10 rounded-xl" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Рука игрока */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-neutral-300">Ваша рука</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => selected != null && setFlipPreview(fp => ({ ...fp, [selected]: !fp[selected] }))}
                className="px-3 py-2 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 text-sm disabled:opacity-40"
                disabled={selected == null}
                title="Перевернуть выбранную фишку (для постановки)"
              >
                <ArrowLeftRight size={16} className="inline -mt-0.5 mr-1" /> Flip выбранной
              </button>
              <button
                onClick={discardSelected}
                className="px-3 py-2 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 text-sm disabled:opacity-40"
                disabled={selected == null || !discards}
                title="Сбросить (−3 очка)"
              >
                <Shuffle size={16} className="inline -mt-0.5 mr-1" /> Сброс ({discards})
              </button>
              <button
                onClick={resetAll}
                className="px-3 py-2 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 text-sm"
                title="Новая партия"
              >
                <RotateCcw size={16} className="inline -mt-0.5 mr-1" /> Заново
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {player.map((t) => (
              <div key={t.id} className={`rounded-2xl p-2 border bg-white/5 border-white/10 ${selected === t.id ? "outline outline-2 outline-amber-300/70" : ""}`}>
                <div className="relative w-24 h-36 rounded-xl overflow-hidden border border-white/10 shadow-md mx-auto">
                  <div className="absolute inset-0 grid grid-cols-2">
                    <div style={{ background: t.joker ? "repeating-linear-gradient(45deg,#0b0b0b 0 7px,#1a1a1a 7px 14px)" : hsl((flipPreview[t.id] ? t.b : t.a).h, (flipPreview[t.id] ? t.b : t.a).s, (flipPreview[t.id] ? t.b : t.a).l) }} />
                    <div style={{ background: t.joker ? "repeating-linear-gradient(45deg,#111 0 7px,#222 7px 14px)" : hsl((flipPreview[t.id] ? t.a : t.b).h, (flipPreview[t.id] ? t.a : t.b).s, (flipPreview[t.id] ? t.a : t.b).l) }} />
                  </div>
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-y-0 left-1/2 w-[2px] bg-black/60" />
                    <div className="absolute inset-0 border border-black/40" />
                    <div className="absolute inset-0 ring-1 ring-white/10 rounded-xl" />
                  </div>
                  {!t.joker && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] bg-black/40 border border-white/10 rounded px-2 py-0.5">
                      {Math.round((flipPreview[t.id] ? t.b : t.a).h)}°/{Math.round((flipPreview[t.id] ? t.a : t.b).h)}°
                    </div>
                  )}
                  {t.joker && <div className="absolute inset-0 flex items-center justify-center text-xl">🃏</div>}
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1">
                  <button onClick={() => { setSelected(t.id); playSelected("left"); }}
                          className="h-8 rounded-md border text-xs bg-emerald-600/90 hover:bg-emerald-500 border-emerald-300/40">←</button>
                  <button onClick={() => setSelected(t.id)} className="h-8 rounded-md border text-xs bg-black/30 hover:bg-black/20 border-white/10">
                    Выбрать
                  </button>
                  <button onClick={() => { setSelected(t.id); playSelected("right"); }}
                          className="h-8 rounded-md border text-xs bg-emerald-600/90 hover:bg-emerald-500 border-emerald-300/40">→</button>
                </div>
                <button onClick={() => setFlipPreview(fp => ({ ...fp, [t.id]: !fp[t.id] }))}
                        className="mt-1 w-full h-8 rounded-md border bg-black/30 hover:bg-black/20 border-white/10 text-xs">
                  <ArrowLeftRight size={14} className="inline -mt-0.5 mr-1" /> flip
                </button>
              </div>
            ))}
          </div>

          {/* Подвал руки */}
          <div className="mt-3 text-sm text-neutral-300">
            Подсказка: подгоняйте половинку к левому/правому краю. Чем ближе оттенок, тем больше очков.
          </div>
        </section>

        {/* Сводка / статус партии */}
        <section className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-neutral-300">Колода</div>
            <div className="text-xl font-semibold">{deck.length}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-neutral-300">Фишек у вас / у бота</div>
            <div className="text-xl font-semibold">{player.length} / {bot.length}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-neutral-300">Сбросов осталось</div>
            <div className="text-xl font-semibold">{discards}</div>
          </div>
        </section>

        {/* Финал */}
        {gameOver && (
          <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-center gap-3 text-lg">
              {player.length === 0 && <Trophy className="text-emerald-300" />}
              {bot.length === 0 && <Skull className="text-amber-300" />}
              <div className="font-semibold">
                Партия завершена. {player.length === 0 ? "Вы выложили все фишки!" : bot.length === 0 ? "Компьютер выложил все фишки." : "Ходы закончились."}
              </div>
            </div>
            <div className="mt-2 text-neutral-300">
              Итог: вы {scoreP} очков · бот {scoreB} очков.
            </div>
            <button onClick={resetAll} className="mt-3 px-3 py-2 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 text-sm">
              <RefreshCw size={16} className="inline -mt-0.5 mr-1" /> Сыграть ещё
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
