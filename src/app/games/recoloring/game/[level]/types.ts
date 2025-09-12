"use client";

/** ---------- Векторная математика ---------- */
export type Vec = { x: number; y: number };
export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const len = (a: Vec) => Math.hypot(a.x, a.y);
export const norm = (a: Vec): Vec => { const L = len(a) || 1; return { x: a.x / L, y: a.y / L }; };
export const det = (a: Vec, b: Vec) => a.x * b.y - a.y * b.x;
export const rad = (deg: number) => (deg * Math.PI) / 180;
export const deg = (radVal: number) => (radVal * 180) / Math.PI;

/** ---------- Цвета (R/G/B как биты) ---------- */
export const C = { R: 1, G: 2, B: 4 } as const;
export type ColorMask = number;
export const maskToHex = (m: number) => {
  const r = (m & C.R) ? 255 : 0, g = (m & C.G) ? 255 : 0, b = (m & C.B) ? 255 : 0;
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
};

/** ---------- Типы мира ---------- */
export type SegmentObj = { kind: "wall" | "mirror" | "reflector"; A: Vec; B: Vec; id?: string };
export type CircleObj  = {
  id: string;
  kind: "filter" | "goal" | "decoy";
  C: Vec; r: number;
  mask?: ColorMask;
  requiredMask?: ColorMask;
};
export type RaySeg = { A: Vec; B: Vec; mask: number };

export type LevelGeometry = {
  frameWallsPct: SegmentObj[];      // рамка (%)
  innerWallsPct: SegmentObj[];      // внутренние стены (%)
  filtersPct: CircleObj[];          // фильтры (%)
  goalPct: CircleObj;               // цель (%)
  decoysPct: CircleObj[];           // обманки (%)
  srcPct: Vec;                      // источник (%)
  srcDeg: number;                   // угол источника
  mirrorsPct: { center: Vec; lenPct: number; deg: number }[]; // стартовые зеркала
};

export type InventoryItemKind = "reflector_short" | "reflector_long" | "reflector_arc";
export type InventoryItem = {
  id: string;
  kind: InventoryItemKind;
  qty: number;
  lengthPct?: number;   // для линейных отражателей
  arcRadiusPct?: number; // зарезервировано под дуги
};
export type Difficulty = "easy" | "normal" | "hard" | "insane";

/** ---------- Геометрия пересечений ---------- */
export function intersectRaySegment(O: Vec, d: Vec, A: Vec, B: Vec): { t: number; P: Vec; u: number } | null {
  const v = sub(B, A); const den = det(d, v);
  if (Math.abs(den) < 1e-9) return null;
  const AO = sub(A, O);
  const t = det(AO, v) / den;
  const u = det(AO, d) / den;
  if (t >= 0 && u >= 0 && u <= 1) return { t, P: add(O, mul(d, t)), u };
  return null;
}
export function intersectRayCircle(O: Vec, d: Vec, Cc: Vec, r: number): { t: number; P: Vec } | null {
  const oc = sub(O, Cc);
  const b = 2 * dot(d, oc);
  const c = dot(oc, oc) - r * r;
  const D = b * b - 4 * c;
  if (D < 0) return null;
  const sD = Math.sqrt(D);
  const t1 = (-b - sD) / 2, t2 = (-b + sD) / 2;
  const t = (t1 >= 1e-6) ? t1 : (t2 >= 1e-6 ? t2 : -1);
  if (t < 0) return null;
  return { t, P: add(O, mul(d, t)) };
}
export function reflectDir(d: Vec, A: Vec, B: Vec): Vec {
  const m = norm(sub(B, A));
  const proj2 = mul(m, 2 * dot(d, m));
  return norm(sub(proj2, d));
}
