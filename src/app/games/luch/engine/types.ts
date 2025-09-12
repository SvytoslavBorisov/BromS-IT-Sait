"use client";

/** ===================== Векторная математика ===================== */
export type Vec = { x: number; y: number };

/** ===================== Цвет как битовая маска ===================== */
export const C = { R: 1, G: 2, B: 4 } as const;   // биты: 001, 010, 100
export type ColorMask = number;

/** Цвет по маске (аддитивно): 0 → серо-белый (для «бесцветного» луча) рисуем отдельно на канвасе */
export const maskToHex = (m: number) => {
  const r = (m & C.R) ? 255 : 0;
  const g = (m & C.G) ? 255 : 0;
  const b = (m & C.B) ? 255 : 0;
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
};

/** ===================== Геометрия уровня ===================== */
export type SegmentObj = {
  id: string;                     // стабильный id для key
  kind: "wall" | "mirror";        // стены и отражатели
  A: Vec;
  B: Vec;
};

export type CircleObj = {
  id: string;
  kind: "filter" | "goal" | "decoy";
  C: Vec;                         // центр
  r: number;                      // радиус (в долях от min(w,h) при %-координатах)
  mask?: ColorMask;               // цвет фильтра/обманки
  requiredMask?: ColorMask;       // цель: какую маску требует
};

export type RaySeg = { A: Vec; B: Vec; mask: number }; // отрезок пути луча + накопленный цвет

export type MirrorSpec = {        // описание зеркала в относительных координатах (%)
  id: string;
  center: Vec;
  lenPct: number;
  deg: number;
};

export type LevelGeometry = {
  frameWallsPct: SegmentObj[];    // внешняя рамка
  innerWallsPct: SegmentObj[];    // внутренние стены
  filtersPct: CircleObj[];
  goalPct: CircleObj;
  decoysPct: CircleObj[];
  srcPct: Vec;
  srcDeg: number;
  mirrorsPct: MirrorSpec[];       // стартовые зеркала
};

/**
 * Для совместимости с твоим импортом в levelGen.ts
 * (был импорт LevelSpec — экспонируем алиас)
 */
export type LevelSpec = LevelGeometry;

/** ===================== Инвентарь ===================== */
export type InventoryItemKind = "reflector_short" | "reflector_long" | "reflector_arc";

export type InventoryItem = {
  id: string;
  kind: InventoryItemKind;
  qty: number;
  lengthPct?: number;    // для линейных отражателей
  arcRadiusPct?: number; // под будущие арочные отражатели
};

/** ===================== Сложность ===================== */
export type Difficulty = "easy" | "normal" | "hard" | "insane";
