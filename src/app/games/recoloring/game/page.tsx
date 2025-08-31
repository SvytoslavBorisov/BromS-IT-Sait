'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  TOOLS, TARGET, PASS_THRESHOLD,
  mixHSL, hslDistance, hslToCss, hueDeltaDeg, clamp
} from '@/lib/games/recoloring/engine';

/**
 * Ключевые добавления:
 *  • Заказчик: бриф + цель на заказ, вознаграждение, «терпимость» (порог), нотатка-референс.
 *  • Гарантированный «рецепт 100%»: генерируем корректируемый сет значений под ограничения TOOLS.
 *  • Подсказка фиксирует ОДИН случайный ещё-неверный инструмент на ПРАВИЛЬНОЕ значение из рецепта.
 *  • Сдача заказа: «Идеально» (100%), «Принято» (в пределах порога), «Возврат» (мимо).
 *  • Экономика: деньги, серия идеалов (стрик), штрафы за подсказки.
 *
 * Примечание: ниже реализован простой «решатель рецепта» под HSL-цель.
 * Он распределяет доли по двум близким пигментам и доводит S/L белилами/сажей/растворителем.
 * Это гарантирует достижимость ровно 100% (при точных значениях).
 */

// ---------------------- ВСПОМОГАТЕЛЬНЫЕ ТИПЫ ----------------------
type Amounts = Record<string, number>;
type Tool = (typeof TOOLS)[number];

type Order = {
  id: number;
  clientName: string;
  note: string;
  target: { h: number; s: number; l: number };
  reward: number;
  tolerance: number; // допустимое отклонение для "Принято"
  deadlineTurns: number; // «ходы» до дедлайна (уменьшается при подсказках и сдачах)
  recipe: Amounts; // гарантированное решение 100%
};

// ---------------------- УТИЛИТЫ ----------------------
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const choice = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function totalVolume(amts: Amounts) {
  return Object.values(amts).reduce((a, b) => a + b, 0);
}

function idMap(): Record<string, Tool> {
  const m: Record<string, Tool> = {};
  TOOLS.forEach(t => { m[t.id] = t as Tool; });
  return m;
}

// Находим два пигмента, оттенки которых ближе всего к target.h
function nearestPigments(targetHue: number) {
  const pigments = TOOLS.filter(t => t.role === 'pigment' && typeof t.hue === 'number') as Tool[];
  const scored = pigments
    .map(p => ({ p, d: Math.abs(hueDeltaDeg(p.hue!, targetHue)) }))
    .sort((a, b) => a.d - b.d);
  return [scored[0]?.p, scored[1]?.p].filter(Boolean) as Tool[];
}

/**
 * Строим гарантированный рецепт 100% под ограничения TOOLS.
 * Идея:
 *  1) Берём два ближайших по hue пигмента P1,P2 → решаем их доли, чтобы приблизить hue.
 *  2) Нормируем общий объём «краски» (например, 100 мл), чтобы шаги/мин/макс были выполнимы.
 *  3) Доводим Saturation: если надо ниже — добавляем «solvent»/medium, если выше — капля «red»/самого насыщенного пигмента.
 *  4) Доводим Lightness: белила (white) вверх, сажа (black) вниз.
 * Все значения жёстко клампятся min/max и настраиваются кратно step инструмента.
 */
function computePerfectRecipe(target: { h: number; s: number; l: number }): Amounts {
  const map = idMap();
  const [p1, p2] = nearestPigments(target.h);
  const baseTotal = 100; // ориентир общего объёма смеси
  const res: Amounts = Object.fromEntries(TOOLS.map(t => [t.id, 0]));

  // Если вдруг пигмент всего один — просто задаём его базой
  if (!p1 && !p2) return res;
  if (p1 && !p2) {
    const v = snapToStep(clamp(baseTotal * 0.8, p1.min, p1.max), p1.step);
    res[p1.id] = v;
  }

  // Две базовые доли для оттенка: берём простую линейку
  if (p1 && p2) {
    const d1 = Math.abs(hueDeltaDeg(p1.hue!, target.h));
    const d2 = Math.abs(hueDeltaDeg(p2.hue!, target.h));
    const w1 = d2 === 0 ? 1 : d2 / (d1 + d2);
    const w2 = 1 - w1;
    let v1 = snapToStep(clamp(baseTotal * w1, p1.min, p1.max), p1.step);
    let v2 = snapToStep(clamp(baseTotal * w2, p2.min, p2.max), p2.step);

    // Если суммарно слишком мало — поджать к минимумам
    if (v1 + v2 < 40) {
      v1 = snapToStep(clamp(p1.min + p1.step, p1.min, p1.max), p1.step);
      v2 = snapToStep(clamp(p2.min + p2.step, p2.min, p2.max), p2.step);
    }
    res[p1.id] = v1;
    res[p2.id] = v2;
  }

  // Черновая смесь → посмотрим фактический h/s/l
  let draft = mixHSL(res);

  // Доводим Saturation
  if (draft.s > target.s) {
    // растворитель/медиум
    const solv = map['solv'] || map['medium'];
    if (solv) {
      const need = Math.min(60, (draft.s - target.s) * 200);
      res[solv.id] = snapToStep(clamp((res[solv.id] || 0) + need, solv.min, solv.max), solv.step);
    }
  } else if (draft.s < target.s) {
    // чуть красного/насыщенного пигмента
    const red = map['red'] ?? nearestHighSaturationPigment();
    if (red) {
      const need = Math.min(40, (target.s - draft.s) * 200);
      res[red.id] = snapToStep(clamp((res[red.id] || 0) + need, red.min, red.max), red.step);
    }
  }

  // Обновим
  draft = mixHSL(res);

  // Доводим Lightness
  if (draft.l < target.l) {
    const white = map['white'];
    if (white) {
      const need = Math.min(60, (target.l - draft.l) * 200);
      res[white.id] = snapToStep(clamp((res[white.id] || 0) + need, white.min, white.max), white.step);
    }
  } else if (draft.l > target.l) {
    const black = map['black'];
    if (black) {
      const need = Math.min(60, (draft.l - target.l) * 200);
      res[black.id] = snapToStep(clamp((res[black.id] || 0) + need, black.min, black.max), black.step);
    }
  }

  // Финальный щёлк — микродоводка 1–2мл по самым влияющим инструментам
  // (делаем 2 итерации, чтобы точнее прилечь к TARGET)
  for (let i = 0; i < 2; i++) {
    draft = mixHSL(res);
    const hueWarm = ((TARGET.h - draft.h + 360) % 360) < 180;
    if (Math.abs(hueDeltaDeg(draft.h, target.h)) > 1) {
      const hueTool = hueWarm ? (idMap()['yellow'] || idMap()['red']) : idMap()['blue'];
      if (hueTool) res[hueTool.id] = snapToStep(clamp((res[hueTool.id] || 0) + 1, hueTool.min, hueTool.max), hueTool.step);
    }
    if (Math.abs(draft.s - target.s) > 0.01) {
      const sUp = draft.s < target.s;
      const tool = sUp ? (idMap()['red'] || nearestHighSaturationPigment()) : (idMap()['solv'] || idMap()['medium']);
      if (tool) res[tool.id] = snapToStep(clamp((res[tool.id] || 0) + 1, tool.min, tool.max), tool.step);
    }
    if (Math.abs(draft.l - target.l) > 0.01) {
      const lUp = draft.l < target.l;
      const tool = lUp ? idMap()['white'] : idMap()['black'];
      if (tool) res[tool.id] = snapToStep(clamp((res[tool.id] || 0) + 1, tool.min, tool.max), tool.step);
    }
  }

  return res;

  function nearestHighSaturationPigment() {
    const pigments = TOOLS.filter(t => t.role === 'pigment' && typeof t.saturation === 'number') as Tool[];
    return pigments.sort((a, b) => (b.saturation! - a.saturation!))[0];
  }
  function snapToStep(v: number, step: number) {
    return Math.round(v / step) * step;
  }
}

// Формируем «заказ» с гарантией достижения 100%
function makeOrder(id: number): Order {
  // Цель может слегка колебаться вокруг TARGET (делает уровни разнообразнее)
  const target = {
    h: Math.round((TARGET.h + rnd(-2, 2) + 360) % 360),
    s: clamp(TARGET.s + rnd(-0.03, 0.03), 0, 1),
    l: clamp(TARGET.l + rnd(-0.03, 0.03), 0, 1),
  };
  const recipe = computePerfectRecipe(target);
  const tol = Math.min(PASS_THRESHOLD, 0.035 + Math.random() * 0.015);
  const clients = ['Антон-дизайнер', 'Куратора Музея', 'Арт-директор Vera', 'Флорентина (бутик)', 'Реквизитор съёмок'];
  const notes = [
    'Нужна тёплая афиша без кислотности.',
    'Попробуйте повторить этот апельсиновый плед.',
    'На витрине слишком холодно — согрейте тон.',
    'Требуется лёгкость и свет — не перегружайте черным.',
    'Фон для фото — без «серости», чуть ярче.'
  ];
  return {
    id,
    clientName: choice(clients),
    note: choice(notes),
    target,
    reward: 180 + Math.floor(Math.random() * 70),
    tolerance: tol,
    deadlineTurns: 3,
    recipe,
  };
}

// Проверка «идеально ли» — строгое совпадение с рецептом по всем инструментам
function isExactlyRecipe(amounts: Amounts, recipe: Amounts) {
  const keys = Object.keys(recipe);
  return keys.every(k => (amounts[k] || 0) === (recipe[k] || 0));
}

// ---------------------- КОМПОНЕНТ ----------------------
export default function Page() {
  // Прогресс/экономика
  const [money, setMoney] = useState(0);
  const [streak, setStreak] = useState(0);

  // Текущий заказ
  const [order, setOrder] = useState<Order>(() => makeOrder(1));

  // Кол-ва инструментов
  const [amounts, setAmounts] = useState<Amounts>(() => Object.fromEntries(TOOLS.map(t => [t.id, 0])));

  // Какие инструменты уже «зафиксированы» подсказками
  const [locked, setLocked] = useState<Record<string, boolean>>({});

  // Подсчёты
  const result = useMemo(() => mixHSL(amounts), [amounts]);
  const distance = useMemo(() => hslDistance(result, order.target), [result, order.target]);
  const matchPct = useMemo(() => clamp(1 - distance / order.tolerance, 0, 1) * 100, [distance, order.tolerance]);
  const passed = distance <= order.tolerance;

  const currentCss = useMemo(() => hslToCss(result.h, result.s, result.l), [result]);
  const targetCss = useMemo(() => hslToCss(order.target.h, order.target.s, order.target.l), [order.target]);

  // Сброс всего
  const resetAll = useCallback(() => {
    setAmounts(Object.fromEntries(TOOLS.map(t => [t.id, 0])));
    setLocked({});
  }, []);

  // Изменение одного инструмента (запрет на изменение «зафиксированных»)
  const setAmount = useCallback((id: string, v: number) => {
    if (locked[id]) return;
    const tool = TOOLS.find(t => t.id === id)!;
    const nv = clamp(Math.round(v), tool.min, tool.max);
    setAmounts(prev => ({ ...prev, [id]: nv }));
  }, [locked]);

  const bump = useCallback((id: string, dir: 1 | -1) => {
    if (locked[id]) return;
    const tool = TOOLS.find(t => t.id === id)!;
    const cur = amounts[id] || 0;
    setAmount(id, cur + dir * tool.step);
  }, [amounts, setAmount, locked]);

  // Подсказка: выбрать случайный «неправильный» инструмент и выставить его ровно по рецепту
  // Стоит 20₽ и -1 к дедлайну (минимум 1)
  const nudgeHint = useCallback(() => {
    const wrong = TOOLS
      .map(t => t.id)
      .filter(id => !locked[id] && (amounts[id] || 0) !== (order.recipe[id] || 0));
    if (wrong.length === 0) return;

    const pick = choice(wrong);
    const rightValue = order.recipe[pick] || 0;

    setAmounts(prev => ({ ...prev, [pick]: rightValue }));
    setLocked(prev => ({ ...prev, [pick]: true }));
    setMoney(m => m - 20);
    setOrder(o => ({ ...o, deadlineTurns: Math.max(1, o.deadlineTurns - 1) }));
  }, [amounts, order.recipe, locked]);

  // Сдать заказ
  const submit = useCallback(() => {
    const exact = isExactlyRecipe(amounts, order.recipe);
    const ok = distance <= order.tolerance;

    let msg: string;
    let delta = 0;
    let addStreak = 0;

    if (exact) {
      msg = 'Идеально! Ровно 100%. Клиент в восторге.';
      delta = order.reward + 40; // премия за 100%
      addStreak = 1;
    } else if (ok) {
      msg = 'Принято. В пределах допусков — клиент доволен.';
      delta = order.reward;
      addStreak = 0;
    } else {
      msg = 'Возврат. Цвет ушёл за рамки допуска.';
      delta = -30; // штраф
      addStreak = -streak; // сброс серии
    }

    alert(`${msg}\nДоход: ${delta > 0 ? '+' : ''}${delta}₽`);
    setMoney(m => m + delta);
    setStreak(s => Math.max(0, s + addStreak));

    // Переход к следующему заказу
    const nextId = order.id + 1;
    setOrder(makeOrder(nextId));
    resetAll();
  }, [amounts, distance, order, streak, resetAll]);

  // На каждый ход (любая правка/подсказка/сдача) можно эмитировать тик дедлайна,
  // но чтобы не раздражать — оставим деградацию только на подсказке и сдаче.

  // Автономно подсвечиваем «почти готово»
  const almost = !isExactlyRecipe(amounts, order.recipe) && distance <= order.tolerance * 0.4;

  return (
    <main className="min-h-dvh bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Мастерская цвета — Заказ #{order.id}</h1>
            <p className="text-neutral-300 mt-1">
              Клиент: <b>{order.clientName}</b>. Заметка: {order.note}
            </p>
          </div>
          <div className="flex items-end gap-6">
            <div className="text-right">
              <div className="text-neutral-400 text-sm">Баланс</div>
              <div className="text-xl font-semibold">{money}₽</div>
            </div>
            <div className="text-right">
              <div className="text-neutral-400 text-sm">Серия идеалов</div>
              <div className="text-xl font-semibold">{streak}×</div>
            </div>
            <div className="text-right">
              <div className="text-neutral-400 text-sm">Дедлайн</div>
              <div className={`text-xl font-semibold ${order.deadlineTurns <= 1 ? 'text-amber-400' : ''}`}>
                {order.deadlineTurns} хода
              </div>
            </div>
            <div className="text-right">
              <div className="text-neutral-400 text-sm">Гонорар</div>
              <div className="text-xl font-semibold">≈{order.reward}₽</div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* ЛЕВО: Целевой образец и показатели */}
          <div className="rounded-2xl border border-neutral-800 p-5 bg-neutral-900/50">
            <h2 className="font-semibold mb-4">Референс заказчика</h2>
            <div
              className="w-full aspect-square rounded-xl shadow-inner border border-neutral-800"
              style={{ background: targetCss }}
              aria-label="Целевой цвет"
              title={`target: ${targetCss}`}
            />
            <div className="mt-4 text-sm text-neutral-300 space-y-1">
              <div>H: <b>{order.target.h}°</b> S: <b>{Math.round(order.target.s * 100)}%</b> L: <b>{Math.round(order.target.l * 100)}%</b></div>
              <div>Допуск (порог): <b>{order.tolerance.toFixed(3)}</b></div>
              <div className="text-neutral-400">Подсказка фиксирует один инструмент на идеальное значение.</div>
            </div>
          </div>

          {/* ЦЕНТР: Текущий цвет — главный квадрат */}
          <div className="rounded-2xl border border-neutral-800 p-5 bg-neutral-900/50">
            <h2 className="font-semibold mb-4">Текущая смесь</h2>
            <div
              className={`w-full aspect-square rounded-2xl border ${isExactlyRecipe(amounts, order.recipe) ? 'border-emerald-500' : passed ? 'border-emerald-600/60' : almost ? 'border-amber-500' : 'border-neutral-800'} shadow-lg transition-all`}
              style={{ background: currentCss }}
              aria-label="Текущий цвет"
              title={`current: ${currentCss}`}
            />
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div className="rounded-lg bg-neutral-800/50 p-3">
                <div className="text-neutral-400">H / S / L</div>
                <div className="font-mono">
                  {`${Math.round(result.h)}° / ${Math.round(result.s * 100)}% / ${Math.round(result.l * 100)}%`}
                </div>
              </div>
              <div className="rounded-lg bg-neutral-800/50 p-3">
                <div className="text-neutral-400">Совпадение</div>
                <div className={`font-semibold ${isExactlyRecipe(amounts, order.recipe) ? 'text-emerald-400' : passed ? 'text-emerald-300' : almost ? 'text-amber-300' : 'text-neutral-100'}`}>
                  {matchPct.toFixed(1)}%
                </div>
                <div className="text-neutral-400 text-xs mt-1">Дистанция: {distance.toFixed(3)}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={resetAll}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 transition-colors border border-neutral-700"
              >
                Сброс
              </button>
              <button
                onClick={nudgeHint}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 transition-colors"
                title="Зафиксировать случайный неверный инструмент на правильное значение (−20₽, −1 ход)"
              >
                Подсказка
              </button>
              <button
                onClick={submit}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 transition-colors"
              >
                Сдать заказ
              </button>
              {isExactlyRecipe(amounts, order.recipe) && (
                <span className="ml-auto px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-600/40">
                  ИДЕАЛЬНО: 100%
                </span>
              )}
              {!isExactlyRecipe(amounts, order.recipe) && passed && (
                <span className="ml-auto px-3 py-1 rounded-lg bg-emerald-600/10 text-emerald-300 border border-emerald-600/30">
                  В допуске: можно сдавать
                </span>
              )}
              {!passed && almost && (
                <span className="ml-auto px-3 py-1 rounded-lg bg-amber-600/10 text-amber-300 border border-amber-600/30">
                  Почти готово
                </span>
              )}
            </div>
          </div>

          {/* ПРАВО: Инструменты */}
          <div className="rounded-2xl border border-neutral-800 p-5 bg-neutral-900/50">
            <h2 className="font-semibold mb-4">Инструменты</h2>
            <div className="space-y-4">
              {TOOLS.map(tool => {
                const v = amounts[tool.id] || 0;
                const isPigment = tool.role === 'pigment';
                const roleLabel =
                  tool.role === 'pigment' ? 'Пигмент'
                  : tool.role === 'white' ? 'Белила'
                  : tool.role === 'black' ? 'Сажа'
                  : tool.role === 'solvent' ? 'Растворитель'
                  : 'Медиум';

                const swatch = isPigment ? hslToCss(tool.hue!, tool.saturation!, tool.lightness!) : undefined;
                const isLocked = !!locked[tool.id];
                const right = order.recipe[tool.id] || 0;
                const isRightAlready = v === right;

                return (
                  <div key={tool.id} className={`rounded-xl border p-3 bg-neutral-900 ${isLocked ? 'border-emerald-700/40' : 'border-neutral-800'}`}>
                    <div className="flex items-center gap-3">
                      {isPigment ? (
                        <div
                          className="w-8 h-8 rounded-md border border-neutral-700"
                          style={{ background: swatch }}
                          title={`${tool.name} образец`}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-md border border-neutral-700 bg-neutral-800 flex items-center justify-center text-xs text-neutral-300">
                          {tool.role === 'white' ? 'W' : tool.role === 'black' ? 'B' : tool.role === 'solvent' ? 'R' : 'M'}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{tool.name}</div>
                          <div className="text-xs text-neutral-400">{roleLabel}</div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => bump(tool.id, -1)}
                            className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 disabled:opacity-40"
                            disabled={isLocked}
                          >
                            −
                          </button>
                          <input
                            type="range"
                            min={tool.min}
                            max={tool.max}
                            step={tool.step}
                            value={v}
                            onChange={(e) => setAmount(tool.id, Number(e.target.value))}
                            className="flex-1"
                            aria-label={`${tool.name} слайдер`}
                            disabled={isLocked}
                          />
                          <button
                            onClick={() => bump(tool.id, +1)}
                            className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 disabled:opacity-40"
                            disabled={isLocked}
                          >
                            +
                          </button>
                          <input
                            type="number"
                            className="w-20 px-2 py-1 rounded-lg bg-neutral-800 border border-neutral-700 text-right disabled:opacity-40"
                            value={v}
                            min={tool.min}
                            max={tool.max}
                            step={tool.step}
                            onChange={(e) => setAmount(tool.id, Number(e.target.value))}
                            disabled={isLocked}
                          />
                          <span className="text-xs text-neutral-400 w-10 text-right">мл</span>
                        </div>
                        {isLocked && (
                          <div className="text-xs text-emerald-400 mt-1">Зафиксировано подсказкой: {right} мл</div>
                        )}
                        {!isLocked && isRightAlready && (
                          <div className="text-xs text-emerald-300 mt-1">Идеально для рецепта</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Сводка по ингредиентам */}
        <section className="mt-8 rounded-2xl border border-neutral-800 p-5 bg-neutral-900/50">
          <h2 className="font-semibold mb-3">Смесь</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-400">
                  <th className="text-left font-medium py-2">Инструмент</th>
                  <th className="text-right font-medium py-2">Текущее (мл)</th>
                  <th className="text-right font-medium py-2">Идеал (мл)</th>
                  <th className="text-right font-medium py-2">Доля</th>
                </tr>
              </thead>
              <tbody>
                {TOOLS.map(t => {
                  const v = amounts[t.id] || 0;
                  const ideal = order.recipe[t.id] || 0;
                  const total = totalVolume(amounts) || 1;
                  const share = v / total;
                  return (
                    <tr key={t.id} className="border-t border-neutral-800">
                      <td className="py-2">{t.name}</td>
                      <td className="py-2 text-right font-mono">{v}</td>
                      <td className={`py-2 text-right font-mono ${v === ideal ? 'text-emerald-300' : 'text-neutral-300'}`}>{ideal}</td>
                      <td className="py-2 text-right font-mono">{(share * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-neutral-400 text-sm mt-3">
            Подсказка фиксирует один из неверных инструментов на «Идеал (мл)». Несколько подсказок — несколько фиксаций.
          </p>
        </section>

        <footer className="mt-8 text-neutral-400 text-sm">
          Совет: начни с базового оттенка (два близких пигмента), затем доводи насыщенность растворителем/насыщенным пигментом и светлоту белилами/сажей.
        </footer>
      </div>
    </main>
  );
}
