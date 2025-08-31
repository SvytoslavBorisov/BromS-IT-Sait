// ----------------------------------- Типы -----------------------------------
export type ToolRole = 'pigment' | 'white' | 'black' | 'solvent' | 'medium';

export type Tool = {
  id: string;
  name: string;
  role: ToolRole;
  hue?: number;        // [0..360)
  saturation?: number; // [0..1]
  lightness?: number;  // [0..1]
  step: number;        // шаг изменения (мл)
  min: number;
  max: number;
};

export type MixResult = {
  h: number;
  s: number;
  l: number;
  total: number;
};

// --------------------------------- Утилиты ----------------------------------
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const lerp  = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);
export const degToRad = (d: number) => (d * Math.PI) / 180;
export const radToDeg = (r: number) => ((r * 180) / Math.PI + 360) % 360;

export const snapToStep = (v: number, step: number) => Math.round(v / step) * step;
export const rndInt = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));
export const choice = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function hueDeltaDeg(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
export function hslDistance(a: { h: number; s: number; l: number }, b: { h: number; s: number; l: number }) {
  const dh = hueDeltaDeg(a.h, b.h) / 180;
  const ds = Math.abs(a.s - b.s);
  const dl = Math.abs(a.l - b.l);
  return Math.sqrt(dh * dh * 1.2 + ds * ds * 1.0 + dl * dl * 0.9);
}
export function hslToCss(h: number, s: number, l: number) {
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

// ------------------------------ Константы уровня ----------------------------
export const TARGET = { h: 30, s: 0.9, l: 0.55 };   // базовая «настройка вкуса», но в заказах переопределяется
export const PASS_THRESHOLD = 0.08;

export const TOOLS: Tool[] = [
  { id: 'red',    name: 'Красный пигмент',    role: 'pigment', hue: 0,   saturation: 0.98, lightness: 0.50, step: 2, min: 0, max: 500 },
  { id: 'yellow', name: 'Жёлтый пигмент',     role: 'pigment', hue: 60,  saturation: 0.95, lightness: 0.55, step: 2, min: 0, max: 500 },
  { id: 'green',  name: 'Зелёный пигмент',    role: 'pigment', hue: 120, saturation: 0.95, lightness: 0.45, step: 2, min: 0, max: 500 },
  { id: 'blue',   name: 'Синий пигмент',      role: 'pigment', hue: 240, saturation: 0.95, lightness: 0.45, step: 2, min: 0, max: 500 },
  { id: 'violet', name: 'Фиолетовый пигмент', role: 'pigment', hue: 285, saturation: 0.92, lightness: 0.50, step: 1, min: 0, max: 60 },

  { id: 'white',  name: 'Белила',            role: 'white',   step: 2, min: 0, max: 200 },
  { id: 'black',  name: 'Сажа',              role: 'black',   step: 2, min: 0, max: 200 },
  { id: 'solv',   name: 'Растворитель',      role: 'solvent', step: 5, min: 0, max: 400 },
  { id: 'medium', name: 'Глянцевый медиум',  role: 'medium',  step: 2, min: 0, max: 150 },
];

// ------------------------------ «Физика» смеси --------------------------------
export function mixHSL(amounts: Record<string, number>): MixResult {
  let sumW = 0;
  let vx = 0, vy = 0;
  let lAccum = 0;

  let white = 0, black = 0, solvent = 0, medium = 0;

  for (const t of TOOLS) {
    const w = amounts[t.id] || 0;
    if (w <= 0) continue;

    if (t.role === 'pigment') {
      sumW += w;
      const angle = degToRad(t.hue!);
      const s = clamp(t.saturation!, 0, 1);
      const l = clamp(t.lightness!, 0, 1);
      vx += w * s * Math.cos(angle);
      vy += w * s * Math.sin(angle);
      lAccum += w * l;
    } else if (t.role === 'white')   white += w;
      else if (t.role === 'black')   black += w;
      else if (t.role === 'solvent') solvent += w;
      else if (t.role === 'medium')  medium += w;
  }

  const totalNonZero = sumW + white + black + solvent + medium;
  if (totalNonZero <= 0 || sumW <= 0) {
    return { h: TARGET.h, s: 0, l: 0.9, total: 0 };
  }

  const baseHue = radToDeg(Math.atan2(vy, vx));
  const vectorLen = Math.sqrt(vx * vx + vy * vy);
  let baseS = clamp(vectorLen / Math.max(sumW, 1e-6), 0, 1);
  let baseL = clamp(lAccum / Math.max(sumW, 1e-6), 0, 1);

  const denom = totalNonZero;
  const aWhite = white / denom;
  const aBlack = black / denom;
  const aSolv  = solvent / denom;
  const aMed   = medium / denom;

  let L = lerp(baseL, 0.97, aWhite);
  let S = baseS * (1 - 0.6 * aWhite);

  L = lerp(L, 0.05, aBlack);
  S = S * (1 - 0.3 * aBlack);

  S = S * (1 - 0.5 * aSolv);

  L = lerp(L, 0.85, 0.6 * aMed);
  S = S * (1 - 0.15 * aMed);

  return { h: baseHue, s: clamp(S, 0, 1), l: clamp(L, 0, 1), total: totalNonZero };
}

// -------------------------- Генерация «точно достижимых» заказов --------------------------
// Идея: сперва строим дискретный РЕЦЕПТ, соблюдая шаги min/max каждого инструмента,
// потом ТАРГЕТ = mixHSL(рецепт). Тогда distance(mixHSL(рецепт), target) === 0.

function pigmentTools(): Tool[] {
  return TOOLS.filter(t => t.role === 'pigment');
}

function modifier(id: string): Tool | undefined {
  return TOOLS.find(t => t.id === id);
}

/** Построить валидный дискретный рецепт (простой, но разнообразный) */
export function buildSolvableRecipe(): Record<string, number> {
  const res: Record<string, number> = Object.fromEntries(TOOLS.map(t => [t.id, 0]));

  // 1–2 базовых пигмента
  const pigs = pigmentTools();
  const count = Math.random() < 0.7 ? 2 : 1;
  const picks = Array.from(new Set([choice(pigs), choice(pigs)])).slice(0, count);

  // Базовый объём краски
  const baseVol = rndInt(60, 160);

  if (picks.length === 1) {
    const p = picks[0]!;
    const v = snapToStep(clamp(baseVol, p.min, p.max), p.step);
    res[p.id] = v;
  } else {
    // Смешиваем два пигмента в сумме ~ baseVol
    const p1 = picks[0]!, p2 = picks[1]!;
    const w = rndInt(25, 75) / 100; // доля первого
    let v1 = snapToStep(clamp(baseVol * w, p1.min, p1.max), p1.step);
    let v2 = snapToStep(clamp(baseVol - v1, p2.min, p2.max), p2.step);
    if (v1 + v2 < 20) { // на всякий случай — не слишком мало
      v1 = snapToStep(clamp(p1.min + p1.step, p1.min, p1.max), p1.step);
      v2 = snapToStep(clamp(p2.min + p2.step, p2.min, p2.max), p2.step);
    }
    res[p1.id] = v1;
    res[p2.id] = v2;
  }

  // Модификаторы — не всегда и в разумных пределах
  const w = modifier('white');
  const b = modifier('black');
  const s = modifier('solv');
  const m = modifier('medium');

  if (w && Math.random() < 0.6) res[w.id] = snapToStep(rndInt(0, 40), w.step);
  if (b && Math.random() < 0.35) res[b.id] = snapToStep(rndInt(0, 20), b.step);
  if (s && Math.random() < 0.55) res[s.id] = snapToStep(rndInt(0, 60), s.step);
  if (m && Math.random() < 0.35) res[m.id] = snapToStep(rndInt(0, 30), m.step);

  // Без пигментов — запрет
  const pigmentSum = pigs.reduce((acc, t) => acc + (res[t.id] || 0), 0);
  if (pigmentSum <= 0) {
    // гарантируем хоть что-то
    const p = choice(pigs);
    res[p.id] = snapToStep(clamp(80, p.min, p.max), p.step);
  }
  return res;
}

/** Вернуть { recipe, target } так, чтобы target ТОЧНО достижим (distance==0) */
export function makeSolvableSpec() {
  const recipe = buildSolvableRecipe();
  const target = mixHSL(recipe); // <<— ВАЖНО: таргет равен фактической смеси из дискретного рецепта
  return { recipe, target };
}
