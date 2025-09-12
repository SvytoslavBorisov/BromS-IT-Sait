import {
  CircleObj,
  SegmentObj,
  MirrorSpec,
  LevelSpec,
  Difficulty,
} from "./types";
import {
  COLOR_R,
  COLOR_G,
  COLOR_B,
  RGB_BITS,
  FILTER_RADIUS_MIN,
  FILTER_RADIUS_MAX,
  PLACE_TRIES,
  BORDER_PAD_PCT,
} from "./constants";
import { genId, randBetween, randInt } from "./utils";

/**
 * Вспомогательные: случайное число/точка в процентах с отступом от краёв
 */
function randPctWithPad(): { x: number; y: number } {
  const min = BORDER_PAD_PCT;
  const max = 1 - BORDER_PAD_PCT;
  return { x: randBetween(min, max), y: randBetween(min, max) };
}

function dist2(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Проверка пересечения по кругам в % системе координат
 * r задан в долях от min(width,height) — поэтому достаточно сравнивать r напрямую.
 */
function circleOverlapsAny(
  c: { C: { x: number; y: number }; r: number },
  others: CircleObj[],
  pad = 0.01
): boolean {
  for (const o of others) {
    const rr = c.r + o.r + pad;
    if (dist2(c.C, o.C) <= rr * rr) return true;
  }
  return false;
}

/**
 * Пытаемся положить круг без пересечений с уже имеющимися кругами
 */
function placeCircleNonOverlapping(
  base: CircleObj[],
  kind: CircleObj["kind"],
  radius: number,
  extra: Partial<CircleObj> = {}
): CircleObj | null {
  for (let i = 0; i < PLACE_TRIES; i++) {
    const C = randPctWithPad();
    const cand: CircleObj = {
      id: genId(kind),
      kind,
      C,
      r: radius,
      ...extra,
    };
    if (!circleOverlapsAny(cand, base)) return cand;
  }
  return null;
}

/**
 * Гарантируем наличие фильтров под нужные биты цели.
 * Если какого-то бита нет — добавляем фильтр с этим битом в случайное место.
 */
function ensureRequiredFilters(
  circles: CircleObj[],
  requiredMask: number,
  difficulty: Difficulty
): CircleObj[] {
  const haveMask = circles
    .filter((c) => c.kind === "filter")
    .reduce((acc, c) => acc | (c.mask ?? 0), 0);

  const needBits = RGB_BITS.filter((b) => (requiredMask & b) !== 0 && (haveMask & b) === 0);
  if (needBits.length === 0) return circles;

  // Больше сложность → меньше радиус и/или больше разброс — можно варьировать.
  const baseR =
    difficulty === "hard"
      ? randBetween(FILTER_RADIUS_MIN * 0.9, FILTER_RADIUS_MAX * 0.9)
      : randBetween(FILTER_RADIUS_MIN, FILTER_RADIUS_MAX);

  const out = circles.slice();
  for (const bit of needBits) {
    const c = placeCircleNonOverlapping(
      out,
      "filter",
      baseR,
      { mask: bit }
    );
    // fallback: если PLACE_TRIES не хватило — всё равно добавим, но без проверки (чтобы точно был)
    out.push(
      c ??
        ({
          id: genId("filter"),
          kind: "filter",
          C: randPctWithPad(),
          r: baseR,
          mask: bit,
        } as CircleObj)
    );
  }
  return out;
}

/**
 * Простейшая рамка поля (четыре сегмента по краям в %)
 */
function makeFrame(): SegmentObj[] {
  const A = { x: BORDER_PAD_PCT, y: BORDER_PAD_PCT };
  const B = { x: 1 - BORDER_PAD_PCT, y: BORDER_PAD_PCT };
  const C = { x: 1 - BORDER_PAD_PCT, y: 1 - BORDER_PAD_PCT };
  const D = { x: BORDER_PAD_PCT, y: 1 - BORDER_PAD_PCT };
  return [
    { id: genId("wall"), kind: "wall", A, B },
    { id: genId("wall"), kind: "wall", A: B, B: C },
    { id: genId("wall"), kind: "wall", A: C, B: D },
    { id: genId("wall"), kind: "wall", A: D, B: A },
  ];
}

/**
 * Базовая генерация уровня
 * — источник
 * — основное зеркало + доп. зеркала
 * — рамка и пара внутренних стен
 * — фильтры/обманки и цель
 * **Важно**: после первичной генерации вызываем ensureRequiredFilters(...)
 */
export function generateLevel(seed: string, difficulty: Difficulty): LevelSpec {
  // Можно инициализировать свой PRNG от seed, если нужно детерминировать.
  // Ниже используем обычный Math.random, но seed оставляем как метку.

  // Источник и угол
  const srcPct = randPctWithPad();
  const srcDeg = randBetween(-180, 180);

  // Зеркала
  const mainMirror: MirrorSpec = {
    id: genId("mirrorMain"),
    center: randPctWithPad(),
    deg: randBetween(-180, 180),
    lenPct: 0.22,
  };

  const extraMirrorsPct: MirrorSpec[] = Array.from({
    length: difficulty === "easy" ? 1 : difficulty === "normal" ? 2 : 3,
  }).map(() => ({
    id: genId("mirror"),
    center: randPctWithPad(),
    deg: randBetween(-180, 180),
    lenPct: randBetween(0.14, 0.18),
  }));

  // Рамка и простые внутренние перегородки
  const frameWallsPct = makeFrame();
  const innerWallsPct: SegmentObj[] = [];
  if (difficulty !== "easy") {
    innerWallsPct.push({
      id: genId("wall"),
      kind: "wall",
      A: { x: 0.35, y: 0.25 },
      B: { x: 0.75, y: 0.25 },
    });
  }
  if (difficulty === "hard") {
    innerWallsPct.push({
      id: genId("wall"),
      kind: "wall",
      A: { x: 0.6, y: 0.55 },
      B: { x: 0.6, y: 0.85 },
    });
  }

  // Цель и требуемая маска
  // Пример: гарантируем, что цель требует 1–3 бит(ов) случайно
  const requireBitsCount = difficulty === "easy" ? 1 : difficulty === "normal" ? randInt(1, 2) : randInt(2, 3);
  const bitsPool = [...RGB_BITS];
  let requiredMask = 0;
  for (let i = 0; i < requireBitsCount && bitsPool.length; i++) {
    const take = bitsPool.splice(randInt(0, bitsPool.length - 1), 1)[0];
    requiredMask |= take;
  }

  const goalPct: CircleObj = {
    id: genId("goal"),
    kind: "goal",
    C: randPctWithPad(),
    r: 0.06,
    requiredMask,
  };

  // Базовые фильтры (могут не покрыть requiredMask — это исправим ниже)
  const filtersPct: CircleObj[] = Array.from({
    length: difficulty === "easy" ? 1 : difficulty === "normal" ? 2 : 3,
  }).map(() => ({
    id: genId("filter"),
    kind: "filter",
    C: randPctWithPad(),
    r: randBetween(FILTER_RADIUS_MIN, FILTER_RADIUS_MAX),
    mask: [COLOR_R, COLOR_G, COLOR_B][randInt(0, 2)],
  }));

  // Обманки
  const decoysPct: CircleObj[] = Array.from({
    length: difficulty === "hard" ? 2 : 1,
  }).map(() => ({
    id: genId("decoy"),
    kind: "decoy",
    C: randPctWithPad(),
    r: randBetween(FILTER_RADIUS_MIN * 0.8, FILTER_RADIUS_MIN * 1.2),
  }));

  // Собираем все круги и ДОГЕНЕРИРУЕМ недостающие фильтры под requiredMask
  let circles: CircleObj[] = [...filtersPct, ...decoysPct, goalPct];
  circles = ensureRequiredFilters(circles, requiredMask, difficulty);

  // На выход — всё в процентах, канвас сам переведёт в пиксели
  const level: LevelSpec = {
    seed,
    difficulty,
    srcPct,
    srcDeg,
    mirrorsPct: [mainMirror, ...extraMirrorsPct],
    frameWallsPct,
    innerWallsPct,
    filtersPct: circles.filter((c) => c.kind === "filter"),
    decoysPct: circles.filter((c) => c.kind === "decoy"),
    goalPct: goalPct,
  };

  return level;
}
