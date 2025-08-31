import { HSL, Tool, ToolDef } from "./types";

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const BASE_COLORS: Record<Tool, HSL> = {
  [Tool.Red]: { h: 0, s: 100, l: 50 },
  [Tool.Green]: { h: 120, s: 100, l: 40 },
  [Tool.Blue]: { h: 240, s: 100, l: 50 },
  [Tool.Yellow]: { h: 60, s: 100, l: 50 },
  [Tool.White]: { h: 0, s: 0, l: 100 },
  [Tool.Black]: { h: 0, s: 0, l: 0 },
  [Tool.Solvent]: { h: 0, s: 0, l: 50 },
  [Tool.Randomizer]: { h: 200, s: 50, l: 50 }, // dummy
  [Tool.Inverter]: { h: 0, s: 0, l: 50 }, // dummy
};

// Преобразование HSL → CSS
export const hslToCss = (c: HSL) =>
  `hsl(${Math.round(c.h)}, ${Math.round(c.s)}%, ${Math.round(c.l)}%)`;

// Среднее смешивание
export const mix = (c1: HSL, c2: HSL): HSL => ({
  h: (c1.h + c2.h) / 2,
  s: (c1.s + c2.s) / 2,
  l: (c1.l + c2.l) / 2,
});

// Добавление "пигмента" (чуть смещает оттенок)
export const addPigment = (base: HSL, pigment: HSL): HSL => ({
  h: (base.h * 2 + pigment.h) / 3,
  s: clamp((base.s + pigment.s) / 2, 0, 100),
  l: clamp((base.l + pigment.l) / 2, 0, 100),
});

// Дополнительные эффекты
const lighten = (c: HSL, amount = 10): HSL => ({
  ...c,
  l: clamp(c.l + amount, 0, 100),
});

const darken = (c: HSL, amount = 10): HSL => ({
  ...c,
  l: clamp(c.l - amount, 0, 100),
});

const dilute = (c: HSL): HSL => ({
  ...c,
  s: clamp(c.s - 20, 0, 100),
  l: clamp(c.l + 10, 0, 100),
});

const invert = (c: HSL): HSL => ({
  h: (c.h + 180) % 360,
  s: c.s,
  l: 100 - c.l,
});

const randomize = (c: HSL): HSL => ({
  h: Math.random() * 360,
  s: clamp(c.s + (Math.random() * 40 - 20), 0, 100),
  l: clamp(c.l + (Math.random() * 40 - 20), 0, 100),
});

// Инструменты
export const TOOLS: ToolDef[] = [
  { id: Tool.Red, name: "Красный пигмент", effect: c => addPigment(c, BASE_COLORS[Tool.Red]) },
  { id: Tool.Green, name: "Зеленый пигмент", effect: c => addPigment(c, BASE_COLORS[Tool.Green]) },
  { id: Tool.Blue, name: "Синий пигмент", effect: c => addPigment(c, BASE_COLORS[Tool.Blue]) },
  { id: Tool.Yellow, name: "Желтый пигмент", effect: c => addPigment(c, BASE_COLORS[Tool.Yellow]) },
  { id: Tool.White, name: "Белила", effect: c => lighten(c, 15) },
  { id: Tool.Black, name: "Сажа", effect: c => darken(c, 15) },
  { id: Tool.Solvent, name: "Растворитель", effect: c => dilute(c) },
  { id: Tool.Inverter, name: "Инвертор", effect: c => invert(c) },
  { id: Tool.Randomizer, name: "Случайный фактор", effect: c => randomize(c) },
];
