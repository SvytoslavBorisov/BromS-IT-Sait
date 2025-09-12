"use client";

import { CircleObj, RaySeg, SegmentObj, Vec } from "./types";

/** -------- Лёгкая алгебра -------- */
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const det = (a: Vec, b: Vec) => a.x * b.y - a.y * b.x;
const norm = (v: Vec): Vec => {
  const L = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / L, y: v.y / L };
};

/** -------- Пересечения -------- */
export function intersectRaySegment(
  O: Vec, d: Vec, A: Vec, B: Vec
): { t: number; P: Vec } | null {
  const v = sub(B, A);
  const den = det(d, v);
  if (Math.abs(den) < 1e-9) return null;
  const AO = sub(A, O);
  const t = det(AO, v) / den;
  const u = det(AO, d) / den;
  if (t >= 0 && u >= 0 && u <= 1) return { t, P: add(O, mul(d, t)) };
  return null;
}

export function intersectRayCircle(
  O: Vec, d: Vec, Cc: Vec, r: number
): { t: number; P: Vec } | null {
  const oc = sub(O, Cc);
  const b = 2 * dot(d, oc);
  const c = dot(oc, oc) - r * r;
  const D = b * b - 4 * c;
  if (D < 0) return null;
  const sD = Math.sqrt(D);
  const t1 = (-b - sD) / 2;
  const t2 = (-b + sD) / 2;
  const t = (t1 >= 1e-6) ? t1 : (t2 >= 1e-6 ? t2 : -1);
  if (t < 0) return null;
  return { t, P: add(O, mul(d, t)) };
}

/** -------- Отражение относительно сегмента -------- */
export function reflectDir(d: Vec, A: Vec, B: Vec): Vec {
  const m = norm(sub(B, A));                    // единичный вдоль сегмента
  const proj2 = mul(m, 2 * dot(d, m));          // 2 * (d·m) * m
  return norm(sub(proj2, d));                   // r = 2proj - d
}

/** -------- Трассировка луча -------- */
export type TraceParams = {
  sourcePx: Vec;                 // источник (px)
  srcDir: Vec;                   // нормализованное направление
  walls: SegmentObj[];           // стены (px)
  mirrors: SegmentObj[];         // зеркала (px): стартовые + игрока
  circles: CircleObj[];          // фильтры / цель / обманки (px)
  maxBounces: number;            // ограничение отражений
  eps: number;                   // смещение после столкновения
};

export type TraceResult = {
  segments: RaySeg[];            // отрезки луча
  sparks: { x: number; y: number; col: number }[]; // вспышки
  hitGoal: boolean;              // достигнута ли цель
};

export function traceRay({
  sourcePx, srcDir, walls, mirrors, circles, maxBounces, eps
}: TraceParams): TraceResult {
  let O = { ...sourcePx };
  let d = norm(srcDir);
  let mask = 0;                  // ВАЖНО: стартовый луч бесцветный (маска = 0)

  const segs: RaySeg[] = [];
  const fx: { x: number; y: number; col: number }[] = [];

  for (let bounce = 0; bounce < maxBounces; bounce++) {
    let bestT = Infinity;
    let hitPoint: Vec | null = null;
    let hitSeg: SegmentObj | null = null;
    let hitCircle: CircleObj | null = null;

    // Сначала сегменты (стены/зеркала)
    for (const s of [...walls, ...mirrors]) {
      const isect = intersectRaySegment(O, d, s.A, s.B);
      if (isect && isect.t < bestT) { bestT = isect.t; hitPoint = isect.P; hitSeg = s; hitCircle = null; }
    }
    // Затем окружности (фильтры/цель/обманки)
    for (const c of circles) {
      const isect = intersectRayCircle(O, d, c.C, c.r);
      if (isect && isect.t < bestT) { bestT = isect.t; hitPoint = isect.P; hitSeg = null; hitCircle = c; }
    }

    // Ничего не нашли — рисуем «в бесконечность»
    if (!hitPoint || !isFinite(bestT)) {
      const far = { x: O.x + d.x * 5000, y: O.y + d.y * 5000 };
      segs.push({ A: O, B: far, mask });
      break;
    }

    // Отрезок до столкновения
    segs.push({ A: O, B: hitPoint, mask });

    // Обработка столкновения
    if (hitCircle) {
      if (hitCircle.kind === "goal") {
        const req = hitCircle.requiredMask ?? 0;
        fx.push({ x: hitPoint.x, y: hitPoint.y, col: mask });
        return { segments: segs, sparks: fx, hitGoal: mask === req };
      }
      if (hitCircle.kind === "filter") {
        mask = mask | (hitCircle.mask ?? 0);     // АДДИТИВНОЕ накопление цвета
        fx.push({ x: hitPoint.x, y: hitPoint.y, col: mask });
        O = { x: hitPoint.x + d.x * eps, y: hitPoint.y + d.y * eps };
        continue;
      }
      if (hitCircle.kind === "decoy") {
        fx.push({ x: hitPoint.x, y: hitPoint.y, col: hitCircle.mask ?? 0 });
        O = { x: hitPoint.x + d.x * eps, y: hitPoint.y + d.y * eps };
        continue;
      }
    }

    if (hitSeg) {
      if (hitSeg.kind === "wall") {
        // упёрлись в стену — завершаем
        return { segments: segs, sparks: fx, hitGoal: false };
      }
      // зеркало — отражаемся
      fx.push({ x: hitPoint.x, y: hitPoint.y, col: mask });
      const r = reflectDir(d, hitSeg.A, hitSeg.B);
      d = r;
      O = { x: hitPoint.x + d.x * eps, y: hitPoint.y + d.y * eps };
      continue;
    }
  }

  return { segments: segs, sparks: fx, hitGoal: false };
}
