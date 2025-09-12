"use client";

import { CircleObj, RaySeg, SegmentObj, Vec } from "./types";

/** ================= УТИЛИТЫ ВЕКТОРОВ ================= */
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const det = (a: Vec, b: Vec) => a.x * b.y - a.y * b.x;

const len = (v: Vec) => Math.hypot(v.x, v.y);
const safeNorm = (v: Vec): Vec => {
  const L = len(v);
  if (!isFinite(L) || L <= 1e-32) return { x: 0, y: 0 };
  return { x: v.x / L, y: v.y / L };
};
const nearZero = (x: number, e = 1e-12) => (Math.abs(x) < e ? 0 : x);

/** Нормаль из касательного m = AB/|AB|. Выбираем ориентацию нормали так, чтобы она смотрела «навстречу» лучу. */
const orientedNormal = (d: Vec, A: Vec, B: Vec): Vec => {
  const m = safeNorm(sub(B, A));        // касательный (вдоль сегмента)
  let n = { x: -m.y, y: m.x };          // одна из нормалей
  // Разворачиваем нормаль так, чтобы d·n < 0 (нормаль направлена против луча)
  if (dot(d, n) >= 0) n = { x: -n.x, y: -n.y };
  return n;
};

/** Стабильное отражение относительно сегмента AB через нормаль. */
export function reflectDir(d: Vec, A: Vec, B: Vec): Vec {
  const dn = orientedNormal(d, A, B);
  // r = d - 2(d·n)n
  const k = 2 * dot(d, dn);
  const r = { x: d.x - k * dn.x, y: d.y - k * dn.y };
  const rn = safeNorm(r);
  // Снижаем микро-шум
  return { x: nearZero(rn.x), y: nearZero(rn.y) };
}

/** ================= УСТОЙЧИВЫЕ ПЕРЕСЕЧЕНИЯ ================= */

const PARALLEL_EPS = 1e-10;     // для детерминанта (почти параллельные)
const T_MIN = 1e-6;             // минимальная дистанция пересечения от O вдоль луча
const U_EPS = 1e-9;             // допуск для попадания на границы сегмента

export function intersectRaySegment(
  O: Vec, d: Vec, A: Vec, B: Vec
): { t: number; P: Vec } | null {
  // d — предполагается нормализованным
  const v = sub(B, A);
  const denom = det(d, v);
  if (Math.abs(denom) < PARALLEL_EPS) return null; // почти параллельно

  const AO = sub(A, O);
  const t = det(AO, v) / denom; // вдоль луча
  if (!(t >= T_MIN && isFinite(t))) return null;

  const u = det(AO, d) / denom; // позиция на сегменте [0..1]
  if (u < -U_EPS || u > 1 + U_EPS) return null;

  const P = add(O, mul(d, t));
  return { t, P };
}

export function intersectRayCircle(
  O: Vec, d: Vec, Cc: Vec, r: number
): { t: number; P: Vec } | null {
  // Решаем при условии |d| ≈ 1. Делта-устойчивый квадратик.
  const oc = sub(O, Cc);
  const b = 2 * dot(d, oc);
  const c = dot(oc, oc) - r * r;
  const D = b * b - 4 * c;
  if (D < 0) return null;

  const sD = Math.sqrt(D);
  let t1 = (-b - sD) / 2;
  let t2 = (-b + sD) / 2;
  if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }

  // Берём ближайший положительный, но не слишком близкий к источнику
  const t = t1 >= T_MIN ? t1 : (t2 >= T_MIN ? t2 : -1);
  if (!(t >= T_MIN && isFinite(t))) return null;

  const P = add(O, mul(d, t));
  return { t, P };
}

/** ================= ТРАССИРОВКА ЛУЧА ================= */

export type TraceParams = {
  sourcePx: Vec;                 // источник (px)
  srcDir: Vec;                   // направление (необязательно норм.; нормализуем)
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
  // Нормализуем направление один раз
  let O = { ...sourcePx };
  let d = safeNorm(srcDir);
  // Если направление нулевое — не рисуем «мусора»
  if (d.x === 0 && d.y === 0) {
    return { segments: [], sparks: [], hitGoal: false };
  }

  // Стартовая маска луча — нулевая (накапливаем фильтрами)
  let mask = 0;

  const segs: RaySeg[] = [];
  const fx: { x: number; y: number; col: number }[] = [];

  // Локальные эпсилоны со страховкой (устраняют «дрожь»/самопересечения)
  const STEP = Math.max(eps, 1e-5);
  const STEP_FILTER = STEP;            // для прохождения через круг
  const STEP_REFLECT = STEP;           // для отхода от зеркала по новому направлению

  for (let bounce = 0; bounce < maxBounces; bounce++) {
    let bestT = Infinity;
    let hitPoint: Vec | null = null;
    let hitSeg: SegmentObj | null = null;
    let hitCircle: CircleObj | null = null;

    // --- Проверяем сегменты (зеркала/стены)
    for (const s of walls) {
      const isect = intersectRaySegment(O, d, s.A, s.B);
      if (isect && isect.t < bestT) {
        bestT = isect.t; hitPoint = isect.P; hitSeg = s; hitCircle = null;
      }
    }
    for (const s of mirrors) {
      const isect = intersectRaySegment(O, d, s.A, s.B);
      if (isect) {
        // При равенстве t с небольшим допуском зеркалу отдаём приоритет перед стеной
        if (isect.t + 1e-9 < bestT || (Math.abs(isect.t - bestT) <= 1e-9 && hitSeg?.kind !== "mirror")) {
          bestT = isect.t; hitPoint = isect.P; hitSeg = s; hitCircle = null;
        }
      }
    }

    // --- Проверяем окружности (фильтры/цель/обманки)
    for (const c of circles) {
      const isect = intersectRayCircle(O, d, c.C, c.r);
      if (isect) {
        // При tie небольшим допуском предпочтём «физически тонкий» объект (круг) —
        // это снижает риск, что стена «съест» касание фильтра на том же t
        if (isect.t + 1e-9 < bestT || (Math.abs(isect.t - bestT) <= 1e-9)) {
          bestT = isect.t; hitPoint = isect.P; hitSeg = null; hitCircle = c;
        }
      }
    }

    // Ничего не нашли — уводим луч далеко и завершаем
    if (!hitPoint || !isFinite(bestT)) {
      const FAR = 5000;
      const far = { x: O.x + d.x * FAR, y: O.y + d.y * FAR };
      segs.push({ A: O, B: far, mask });
      break;
    }

    // Отрисовываем участок до столкновения
    segs.push({ A: O, B: hitPoint, mask });

    // --- Обработка столкновения с окружностью
    if (hitCircle) {
      if (hitCircle.kind === "goal") {
        const req = hitCircle.requiredMask ?? 0;
        fx.push({ x: hitPoint.x, y: hitPoint.y, col: mask });
        return { segments: segs, sparks: fx, hitGoal: mask === req };
      }

      if (hitCircle.kind === "filter") {
        // аддитивное накопление цветовой маски
        mask = mask | (hitCircle.mask ?? 0);
        fx.push({ x: hitPoint.x, y: hitPoint.y, col: mask });
        // Продолжаем по прежнему направлению, аккуратно отходя вперёд
        O = { x: hitPoint.x + d.x * STEP_FILTER, y: hitPoint.y + d.y * STEP_FILTER };
        continue;
      }

      if (hitCircle.kind === "decoy") {
        fx.push({ x: hitPoint.x, y: hitPoint.y, col: hitCircle.mask ?? 0 });
        O = { x: hitPoint.x + d.x * STEP_FILTER, y: hitPoint.y + d.y * STEP_FILTER };
        continue;
      }
    }

    // --- Обработка столкновения с сегментом
    if (hitSeg) {
      if (hitSeg.kind === "wall") {
        // Уперлись в стену — луч гаснет
        fx.push({ x: hitPoint.x, y: hitPoint.y, col: mask });
        return { segments: segs, sparks: fx, hitGoal: false };
      }
      // Зеркало — считаем отражение через нормаль (устойчиво к касаниям)
      fx.push({ x: hitPoint.x, y: hitPoint.y, col: mask });
      const r = reflectDir(d, hitSeg.A, hitSeg.B);
      d = r;
      // Отходим по НОВОМУ направлению (важно для устранения самопересечения)
      O = { x: hitPoint.x + d.x * STEP_REFLECT, y: hitPoint.y + d.y * STEP_REFLECT };
      continue;
    }
  }

  return { segments: segs, sparks: fx, hitGoal: false };
}
