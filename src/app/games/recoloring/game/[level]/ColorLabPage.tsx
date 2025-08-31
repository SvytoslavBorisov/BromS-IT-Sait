'use client';

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Paintbrush, Target as TargetIcon, Sparkles, Timer, BadgeDollarSign, Droplets, Eraser, MessageCircle } from 'lucide-react';
import {
  TOOLS, PASS_THRESHOLD,
  mixHSL, hslDistance, hslToCss, clamp,
  makeSolvableSpec
} from '@/lib/games/recoloring/engine';

type Amounts = Record<string, number>;
type Tool = (typeof TOOLS)[number];

const IDEAL_EPS = 1e-12;
const choice = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const sum = (o: Amounts) => Object.values(o).reduce((a, b) => a + b, 0);
const isIdeal = (distance: number) => distance <= IDEAL_EPS;

/* ─────────────────────────────────────────────────────────────────────────────
   1) ЧЕЛОВЕЧНОЕ ОПИСАНИЕ ЦВЕТА + ЖИВЫЕ ПОДСКАЗКИ
   ───────────────────────────────────────────────────────────────────────────── */

function signedHueDeltaDeg(from: number, to: number) {
  // минимальная подписанная разница to - from в диапазоне [-180, 180]
  let d = ((to - from + 540) % 360) - 180;
  return d;
}

function hueName(h: number) {
  // простая квантизация оттенков с русскими названиями
  const ranges: Array<[number, string]> = [
    [0, 'алый'], [15, 'красно-оранжевый'], [30, 'оранжевый'], [45, 'янтарный'],
    [60, 'жёлтый'], [90, 'лаймовый'], [120, 'зелёный'], [150, 'зеленовато-бирюзовый'],
    [180, 'бирюзовый'], [210, 'лазурный'], [240, 'синий'], [270, 'фиолетовый'],
    [300, 'пурпурный'], [330, 'малиновый'], [360, 'алый']
  ];
  const x = ((h % 360) + 360) % 360;
  let last = ranges[0][1];
  for (const [deg, name] of ranges) {
    if (x >= deg) last = name;
  }
  return last;
}

function satWord(s: number) {
  if (s < 0.18) return 'приглушённый';
  if (s < 0.45) return 'мягкий';
  if (s < 0.75) return 'насыщенный';
  return 'сочный';
}

function lightWord(l: number) {
  if (l < 0.18) return 'очень тёмный';
  if (l < 0.35) return 'тёмный';
  if (l < 0.65) return 'средний по светлоте';
  if (l < 0.85) return 'светлый';
  return 'очень светлый';
}

function temperatureWord(h: number) {
  const x = ((h % 360) + 360) % 360;
  const warm = x <= 60 || x >= 330;
  const cold = x >= 180 && x <= 260;
  if (warm) return 'тёплый';
  if (cold) return 'холодный';
  return 'нейтральный';
}

function humanColorDesc(h: number, s: number, l: number) {
  return `${temperatureWord(h)} ${hueName(h)}, ${satWord(s)}, ${lightWord(l)}`;
}

function pigmentIdByTone(desired: 'warm' | 'cool') {
  // простая эвристика подсказываемого пигмента
  if (desired === 'warm') {
    // чаще жёлтый для «согреть»
    return (TOOLS.find(t => t.id === 'yellow') ? 'yellow' : 'red');
  } else {
    // для «охладить» — синий/зелёный
    return (TOOLS.find(t => t.id === 'blue') ? 'blue' : 'green');
  }
}

function buildAdvice(current: {h:number;s:number;l:number}, target: {h:number;s:number;l:number}) {
  const parts: string[] = [];

  // Hue — «теплее/холоднее»
  const dh = signedHueDeltaDeg(current.h, target.h);
  if (Math.abs(dh) > 4) {
    if (dh > 0) parts.push('чуть теплее (в сторону жёлтого/красного)');
    else parts.push('чуть холоднее (в сторону синего/зелёного)');
  }

  // Saturation — «ярче/приглушить»
  const ds = target.s - current.s;
  if (Math.abs(ds) > 0.03) {
    if (ds > 0) parts.push('прибавить яркости (меньше растворителя или каплю пигмента)');
    else parts.push('чуть приглушить (каплю растворителя или белил)');
  }

  // Lightness — «светлее/темнее»
  const dl = target.l - current.l;
  if (Math.abs(dl) > 0.03) {
    if (dl > 0) parts.push('посветлее (каплю белил)');
    else parts.push('потемнее (чуть сажи)');
  }

  if (!parts.length) {
    return 'Отлично! Почти в точке. Микродвижение — и будет идеально.';
  }

  // Сформируем живую фразу в духе клиента
  const openers = ['Мне кажется,', 'На глаз,', 'Если прищуриться,', 'Чуть-чуть бы ещё,', 'Знаешь,'];
  return `${choice(openers)} ${parts.join('; ')}.`;
}

/* ─────────────────────────────────────────────────────────────────────────────
   2) ВИЗУАЛ: компактные квадраты + палитра-тюбики под ними + рецепт-лента
   ───────────────────────────────────────────────────────────────────────────── */

function StatChip({ icon, label, value, warn = false }: { icon: React.ReactNode; label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 backdrop-blur ${warn ? 'border-amber-300/40 bg-amber-300/10' : 'border-white/10 bg-white/5'}`}>
      <div className="text-xs text-neutral-300 flex items-center gap-1">{icon} {label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

function ShareBar({ amounts }: { amounts: Amounts }) {
  const total = sum(amounts) || 1;
  return (
    <div className="w-full">
      <div className="h-4 rounded-lg overflow-hidden border border-white/10 bg-black/30 flex">
        {TOOLS.map(t => {
          const v = amounts[t.id] || 0;
          if (v <= 0) return null;
          const pct = (v / total) * 100;
          const color =
            t.role === 'pigment' && t.hue != null
              ? hslToCss(t.hue!, t.saturation ?? 0.9, (t.lightness ?? 0.5) * 0.9)
              : t.role === 'white' ? '#e5e7eb'
              : t.role === 'black' ? '#111827'
              : t.role === 'solvent' ? '#7dd3fc'
              : '#d1fae5';
          return <div key={t.id} className="h-full" style={{ width: `${pct}%`, background: color }} />;
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {TOOLS.map(t => (
          <span key={t.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                background: t.role === 'pigment' && t.hue != null
                  ? hslToCss(t.hue!, t.saturation ?? 0.9, (t.lightness ?? 0.5) * 0.9)
                  : t.role === 'white' ? '#e5e7eb'
                  : t.role === 'black' ? '#111827'
                  : t.role === 'solvent' ? '#7dd3fc'
                  : '#d1fae5'
              }}
            />
            {t.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function PaintTube({
  tool, value, ideal, locked, onChange, onBump,
}: {
  tool: Tool; value: number; ideal: number; locked: boolean;
  onChange: (id: string, newValue: number) => void;
  onBump: (id: string, dir: 1 | -1) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const min = tool.min, max = tool.max, step = tool.step;
  const t = (value - min) / Math.max(1, max - min);
  const tIdeal = (ideal - min) / Math.max(1, max - min);

  const bg =
    tool.role === 'pigment' && tool.hue != null
      ? `linear-gradient(90deg, ${hslToCss(tool.hue!, Math.min(1, (tool.saturation ?? 0.95) * 0.7), Math.min(1, (tool.lightness ?? 0.5) * 0.9))} 0%, ${hslToCss(tool.hue!, tool.saturation ?? 0.95, tool.lightness ?? 0.5)} 100%)`
      : tool.role === 'white'
        ? 'linear-gradient(90deg,#cbd5e1,#f8fafc)'
        : tool.role === 'black'
          ? 'linear-gradient(90deg,#0f172a,#111827)'
          : tool.role === 'solvent'
            ? 'linear-gradient(90deg,#67e8f9,#38bdf8)'
            : 'linear-gradient(90deg,#bbf7d0,#34d399)';

  const handleClick = (e: React.MouseEvent) => {
    if (locked || !barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const raw = min + ratio * (max - min);
    const snapped = Math.round(raw / step) * step;
    onChange(tool.id, snapped);
  };

  return (
    <div className={`rounded-2xl p-3 border ${locked ? 'border-emerald-400/30 bg-emerald-500/5' : 'border-white/10 bg-white/5'} backdrop-blur`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md border border-white/10"
               style={{ background: tool.role === 'pigment' && tool.hue != null ? hslToCss(tool.hue!, tool.saturation ?? 0.95, tool.lightness ?? 0.5) : 'linear-gradient(135deg,#111,#333)' }} />
          <div>
            <div className="font-medium leading-5 text-sm">{tool.name}</div>
            <div className="text-[11px] text-neutral-300">
              {tool.role === 'pigment' ? 'Пигмент' : tool.role === 'white' ? 'Белила' : tool.role === 'black' ? 'Сажа' : tool.role === 'solvent' ? 'Растворитель' : 'Медиум'}
            </div>
          </div>
        </div>
        <div className="text-sm text-neutral-200 font-mono">{value} мл</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onBump(tool.id, -1)}
          disabled={locked}
          className="h-8 px-3 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 disabled:opacity-40"
        >−</button>

        {/* Капсула-бар компактнее по высоте */}
        <div className="relative h-7 flex-1 rounded-xl overflow-hidden border border-white/10 cursor-pointer"
             style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.2),rgba(0,0,0,0)), #0b0b0b' }}
             onClick={handleClick}
             ref={barRef}
             title="Кликни по капсуле, чтобы выставить объём"
        >
          <div className="absolute inset-y-0 left-0" style={{ width: `${t * 100}%`, background: bg }} />
          <div className="absolute inset-y-0 left-0 right-0 opacity-30 pointer-events-none mix-blend-screen"
               style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.25),transparent 60%)' }} />
          <div className="absolute inset-y-0" style={{ left: `${tIdeal * 100}%` }}>
            <div className="w-0.5 h-full bg-white/80 drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
          </div>
          <div className="absolute inset-0 pointer-events-none opacity-15">
            <div className="grid h-full" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
              {Array.from({ length: 10 }).map((_, i) => <div key={i} className="border-r border-white/10" />)}
            </div>
          </div>
        </div>

        <button
          onClick={() => onBump(tool.id, +1)}
          disabled={locked}
          className="h-8 px-3 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 disabled:opacity-40"
        >+</button>
      </div>

      <div className="mt-1 text-[11px]">
        Идеал: <span className={`${value === ideal ? 'text-emerald-300' : 'text-neutral-200'} font-mono`}>{ideal}</span> мл
        {locked && <span className="ml-2 text-emerald-400">✓ зафиксировано</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   3) ЗАКАЗ + СТРАНИЦА
   ───────────────────────────────────────────────────────────────────────────── */

type Order = {
  id: number;
  clientName: string;
  note: string;
  target: { h: number; s: number; l: number };
  reward: number;
  tolerance: number;
  deadlineTurns: number;
  recipe: Amounts;
};

function makeOrder(id: number): Order {
  const { recipe, target } = makeSolvableSpec(); // 0.000 достижим
  const reward = 220 + Math.floor(Math.random() * 120);
  const tol = Math.min(PASS_THRESHOLD, 0.035 + Math.random() * 0.015);
  const clients = ['Антон (студия)', 'Куратор музея', 'Vera, арт-директор', 'Бутик «Флорентина»', 'Реквизитор съёмок'];
  const notes = [
    'Повторите тон образца. Без кислотности.',
    'Живой тёплый тон, без серости.',
    'Аккуратнее с белилами и растворителем.',
    'Чуть ярче, но не кричаще.',
    'Чистый оттенок, не уводите в холод.'
  ];
  return {
    id,
    clientName: choice(clients),
    note: choice(notes),
    target,
    reward,
    tolerance: tol,
    deadlineTurns: 3,
    recipe,
  };
}

export default function ColorLabPage() {
  const [money, setMoney] = useState(0);
  const [streak, setStreak] = useState(0);
  const [order, setOrder] = useState<Order>(() => makeOrder(1));
  const [amounts, setAmounts] = useState<Amounts>(() => Object.fromEntries(TOOLS.map(t => [t.id, 0])));
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [tips, setTips] = useState<string[]>(() => [
    `Клиент: нужен ${humanColorDesc(order.target.h, order.target.s, order.target.l)}.`
  ]);

  const result = useMemo(() => mixHSL(amounts), [amounts]);
  const distance = useMemo(() => hslDistance(result, order.target), [result, order.target]);
  const passed = distance <= order.tolerance;
  const matchPct = useMemo(() => (isIdeal(distance) ? 100 : clamp(1 - distance / order.tolerance, 0, 1) * 100), [distance, order.tolerance]);

  const currentCss = useMemo(() => hslToCss(result.h, result.s, result.l), [result]);
  const targetCss  = useMemo(() => hslToCss(order.target.h, order.target.s, order.target.l), [order.target]);

  const pushTip = useCallback((msg: string) => {
    setTips(prev => (prev.length >= 6 ? [...prev.slice(-5), msg] : [...prev, msg]));
  }, []);

  const resetAll = useCallback(() => {
    setAmounts(Object.fromEntries(TOOLS.map(t => [t.id, 0])));
    setLocked({});
    pushTip('Окей, начнём заново. Сначала выведем тон, потом — светлоту.');
  }, [pushTip]);

  const adviseFor = useCallback((next: Amounts) => {
    const r = mixHSL(next);
    return buildAdvice(r, order.target);
  }, [order.target]);

  const setAmount = useCallback((id: string, v: number) => {
    if (locked[id]) return;
    const tool = TOOLS.find(t => t.id === id)!;
    const nv = clamp(Math.round(v), tool.min, tool.max);
    const next = { ...amounts, [id]: nv };
    setAmounts(next);
    pushTip(adviseFor(next));
  }, [locked, amounts, pushTip, adviseFor]);

  const bump = useCallback((id: string, dir: 1 | -1) => {
    if (locked[id]) return;
    const tool = TOOLS.find(t => t.id === id)!;
    const cur = amounts[id] || 0;
    const nv = cur + dir * tool.step;
    const next = { ...amounts, [id]: clamp(Math.round(nv), tool.min, tool.max) };
    setAmounts(next);
    pushTip(adviseFor(next));
  }, [amounts, setAmounts, locked, pushTip, adviseFor]);

  const nudgeHint = useCallback(() => {
    const wrong = TOOLS
      .map(t => t.id)
      .filter(id => !locked[id] && (amounts[id] || 0) !== (order.recipe[id] || 0));
    if (wrong.length === 0) return;
    const pick = choice(wrong);
    const rightValue = order.recipe[pick] || 0;
    const next = { ...amounts, [pick]: rightValue };
    setAmounts(next);
    setLocked(prev => ({ ...prev, [pick]: true }));
    setMoney(m => m - 20);
    pushTip(`Зафиксировал «${TOOLS.find(t => t.id === pick)?.name}» на ${rightValue} мл.`);
    // небольшая рекомендация после фикса
    pushTip(adviseFor(next));
  }, [amounts, order.recipe, locked, pushTip, adviseFor]);

  const submit = useCallback(() => {
    const ideal = isIdeal(distance);
    let msg: string; let delta = 0; let nextStreak = streak;

    if (ideal) { msg = 'Идеально! 100% (0.000)'; delta = order.reward + 60; nextStreak = streak + 1; }
    else if (passed) { msg = 'Принято в допуске'; delta = order.reward; }
    else { msg = 'Возврат: вне допусков'; delta = -30; nextStreak = 0; }

    alert(`${msg}\nДоход: ${delta > 0 ? '+' : ''}${delta}₽`);
    setMoney(m => m + delta);
    setStreak(nextStreak);

    const nextId = order.id + 1;
    const newOrder = makeOrder(nextId);
    setOrder(newOrder);
    setAmounts(Object.fromEntries(TOOLS.map(t => [t.id, 0])));
    setLocked({});
    setTips([`Клиент: нужен ${humanColorDesc(newOrder.target.h, newOrder.target.s, newOrder.target.l)}.`]);
  }, [distance, passed, order, streak]);

  const almost = !isIdeal(distance) && distance <= order.tolerance * 0.4;

  /* ───────────────────────────────────────────────────────────────────────── */

  return (
    <main className="min-h-dvh relative text-neutral-100">
      {/* Фон-фото мастерской (замени путь на свой при необходимости) */}
      <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/images/atelier.jpg')" }} />
      <div className="absolute inset-0 -z-10 bg-black/70 backdrop-blur-[2px]" />

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Шапка (компактнее) */}
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Paintbrush className="opacity-80" /> Мастерская цвета — Заказ #{order.id}
            </h1>
            <p className="text-neutral-300 mt-1 text-sm md:text-base">
              Клиент: <b>{order.clientName}</b>. <span className="opacity-90">{order.note}</span>
            </p>
          </div>
          <div className="flex items-end gap-3 md:gap-4">
            <StatChip icon={<BadgeDollarSign size={16}/>} label="Баланс" value={<>{money}₽</>} />
            <StatChip icon={<Sparkles size={16}/>} label="Идеалы" value={<>{streak}×</>} />
            <StatChip icon={<Timer size={16}/>} label="Дедлайн" value={<>{order.deadlineTurns} хода</>} warn={order.deadlineTurns <= 1} />
          </div>
        </header>

        {/* Ряд компактных квадратов + блок подсказок */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ЛЕВО: референс (квадрат поменьше) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <h2 className="font-medium mb-3 flex items-center gap-2"><TargetIcon size={18} className="opacity-70"/> Референс</h2>
            <div className="w-full rounded-xl border border-white/10 shadow-inner h-44 sm:h-52 md:h-56" style={{ background: targetCss }} />
            <div className="mt-3 text-sm">
              <div className="text-neutral-300">Цвет по-человечески:</div>
              <div className="font-medium">{humanColorDesc(order.target.h, order.target.s, order.target.l)}</div>
            </div>
            <div className="mt-2 text-xs text-neutral-300">Допуск: <b>{order.tolerance.toFixed(3)}</b> • Идеал = <b>0.000</b></div>
          </div>

          {/* ЦЕНТР: текущая смесь (квадрат поменьше) */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <h2 className="font-medium mb-3 flex items-center gap-2"><Droplets size={18} className="opacity-70"/> Текущая смесь</h2>
            <div className={`w-full rounded-xl border h-44 sm:h-52 md:h-56 ${
              isIdeal(distance) ? 'border-emerald-400/70' : passed ? 'border-emerald-300/40' : almost ? 'border-amber-400/50' : 'border-white/10'
            } shadow-lg transition-all`} style={{ background: currentCss }} />
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <div className="text-neutral-300">H/S/L</div>
                <div className="font-mono">{`${Math.round(result.h)}° / ${Math.round(result.s * 100)}% / ${Math.round(result.l * 100)}%`}</div>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                <div className="text-neutral-300">Дистанция</div>
                <div className={`font-semibold ${isIdeal(distance) ? 'text-emerald-300' : 'text-neutral-100'}`}>{distance.toFixed(3)}</div>
                <div className="text-xs text-neutral-400">{isIdeal(distance) ? 'ИДЕАЛ: 100%' : passed ? 'В допуске' : 'Нужно ближе'}</div>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <div className="text-neutral-300">По-человечески:</div>
              <div className="font-medium">{humanColorDesc(result.h, result.s, result.l)}</div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={resetAll} className="px-3 py-2 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 flex items-center gap-2 text-sm"><Eraser size={16}/> Сброс</button>
              <button onClick={nudgeHint} className="px-3 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-500 border border-amber-300/40 text-sm">Подсказка</button>
              <button onClick={submit} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-300/40 text-sm">Сдать</button>
              {isIdeal(distance) && (
                <span className="ml-auto px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">ИДЕАЛ: 100%</span>
              )}
            </div>
          </div>

          {/* ПРАВО: «Комментарий мастера» — живые подсказки после каждого хода */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <h2 className="font-medium mb-3 flex items-center gap-2"><MessageCircle size={18} className="opacity-70"/> Комментарий мастера</h2>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {tips.map((t, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">{t}</div>
              ))}
            </div>
          </div>
        </section>

        {/* ПАЛИТРА — ПОСЛЕ КВАДРАТОВ, КОМПАКТНАЯ СЕТКА */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <h3 className="font-medium mb-3">Палитра и инструменты</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {TOOLS.map(tool => (
              <PaintTube
                key={tool.id}
                tool={tool}
                value={amounts[tool.id] || 0}
                ideal={order.recipe[tool.id] || 0}
                locked={!!locked[tool.id]}
                onChange={setAmount}
                onBump={bump}
              />
            ))}
          </div>
          <p className="text-xs text-neutral-300 mt-2">
            Совет: кликай по цветной капсуле для быстрого выбора объёма. Тонкая вертикальная риска — идеал.
          </p>
        </section>

        {/* СВОДКА — РЕЦЕПТ-ЛЕНТА */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <h3 className="font-medium mb-2">Рецепт-лента (доли смеси)</h3>
          <ShareBar amounts={amounts} />
          <div className="mt-2 text-sm text-neutral-300">
            Идеал достигается при дистанции <b>0.000</b>; заказы сгенерированы так, чтобы это было возможно.
          </div>
        </section>
      </div>
    </main>
  );
}
