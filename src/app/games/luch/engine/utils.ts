import { Vec, C } from "./types";

/** Простая монотонная генерация id (без зависимости от индексов массива) */
let __uid = 0;
export const genId = (prefix = "id") => `${prefix}-${++__uid}-${Date.now().toString(36)}`;

/** Градусы ↔ радианы */
export const rad = (deg: number) => (deg * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;

/** Ограничение точки в процентах (чтобы не уезжать под рамку) */
export const clampPct = (p: Vec): Vec => ({
  x: Math.max(0.04, Math.min(0.96, p.x)),
  y: Math.max(0.06, Math.min(0.94, p.y)),
});

/** Конвертеры % ↔ px */
export const toPx = (p: Vec, w: number, h: number): Vec => ({ x: p.x * w, y: p.y * h });
export const toPct = (p: Vec, w: number, h: number): Vec => ({ x: p.x / w, y: p.y / h });

/** Безопасный нормализованный вектор */
export const norm = (v: Vec): Vec => {
  const L = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / L, y: v.y / L };
};

/** Описание маски как строки без вложенных тернарников (для UI) */
export const describeMask = (m: number) => {
  if (m === (C.R | C.G | C.B)) return "RGB";
  if (m === (C.R | C.B)) return "R+B";
  if (m === (C.R | C.G)) return "R+G";
  if (m === (C.G | C.B)) return "G+B";
  if (m === C.R) return "R";
  if (m === C.G) return "G";
  if (m === C.B) return "B";
  return "—";
};

/** Ключ для точек (без индексов), чтобы не ругался Sonar */
export const pointKey = (x: number, y: number, extra = "") =>
  `${Math.round(x)}_${Math.round(y)}${extra ? "_" + extra : ""}`;

/** ===== СЛУЧАЙНЫЕ ЧИСЛА (добавлено для levelGen) ===== */
export const randBetween = (min: number, max: number) => Math.random() * (max - min) + min;
export const randInt = (min: number, max: number) => Math.floor(randBetween(min, max + 1));

