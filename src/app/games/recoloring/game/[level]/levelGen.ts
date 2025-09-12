"use client";
import { C, CircleObj, Difficulty, LevelGeometry, SegmentObj, Vec } from "./types";

/** Линейный конгруэнтный генератор для воспроизводимого seed */
function lcgrand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const randAngle = (rand: () => number, min = -80, max = 80) =>
  min + (max - min) * rand();
const randPct = (rand: () => number, padX = 0.06, padY = 0.08): Vec => ({
  x: padX + (1 - 2 * padX) * rand(),
  y: padY + (1 - 2 * padY) * rand(),
});
const maskPool = [C.R, C.G, C.B] as const;

export function generateLevel(seedStr: string, difficulty: Difficulty): LevelGeometry {
  const seed = Array.from(seedStr).reduce((a, c) => ((a * 131) ^ c.charCodeAt(0)) >>> 0, 2166136261) >>> 0;
  const R = lcgrand(seed);

  const cfg = {
    easy:   { innerWalls: 1, decoys: 0, filters: 2, mirrors: 1, lenMain: 0.24, lenExtra: [0.18], goalPad: 0.14 },
    normal: { innerWalls: 2, decoys: 1, filters: 2, mirrors: 2, lenMain: 0.22, lenExtra: [0.16, 0.14], goalPad: 0.10 },
    hard:   { innerWalls: 3, decoys: 2, filters: 3, mirrors: 2, lenMain: 0.20, lenExtra: [0.16, 0.14], goalPad: 0.08 },
    insane: { innerWalls: 4, decoys: 3, filters: 3, mirrors: 3, lenMain: 0.18, lenExtra: [0.16, 0.14, 0.12], goalPad: 0.06 },
  }[difficulty];

  // рамка
  const frameWallsPct: SegmentObj[] = [
    { kind: "wall", A: { x: 0.02, y: 0.04 }, B: { x: 0.98, y: 0.04 } },
    { kind: "wall", A: { x: 0.98, y: 0.04 }, B: { x: 0.98, y: 0.96 } },
    { kind: "wall", A: { x: 0.98, y: 0.96 }, B: { x: 0.02, y: 0.96 } },
    { kind: "wall", A: { x: 0.02, y: 0.96 }, B: { x: 0.02, y: 0.04 } },
  ];

  // внутренние стены
  const innerWallsPct: SegmentObj[] = Array.from({ length: cfg.innerWalls }).map(() => {
    const A = randPct(R);
    const B = randPct(R);
    return { kind: "wall", A, B };
  });

  // источник и угол
  const srcPct = randPct(R, 0.08, 0.12);
  const srcDeg = randAngle(R, -20, 40);

  // цель (требуемая маска) — начальный луч всегда бесцветный (mask=0)
  const goalPad = cfg.goalPad;
  const goalCenter = { x: 1 - goalPad - R() * 0.18, y: goalPad + R() * 0.20 };
  const requiredMask =
    difficulty === "easy"   ? (C.R | C.B) :
    difficulty === "normal" ? (R() < 0.5 ? (C.R | C.B) : (C.R | C.G)) :
    difficulty === "hard"   ? (R() < 0.34 ? (C.R | C.B) : (R() < 0.67 ? (C.R | C.G) : (C.G | C.B))) :
                               (R() < 0.5 ? (C.R | C.G | C.B) : (C.R | C.B));

  const goalPct: CircleObj = {
    id: "GOAL",
    kind: "goal",
    C: goalCenter,
    r: 0.035,
    requiredMask,
  };

  // фильтры
  const filtersPct: CircleObj[] = Array.from({ length: cfg.filters }).map((_, i) => {
    const m = maskPool[Math.floor(R() * maskPool.length)];
    return { id: `F${i}`, kind: "filter", C: randPct(R, 0.10, 0.12), r: 0.03, mask: m };
  });

  // обманки
  const decoysPct: CircleObj[] = Array.from({ length: cfg.decoys }).map((_, i) => ({
    id: `D${i}`, kind: "decoy", C: randPct(R, 0.08, 0.10), r: 0.028, mask: maskPool[Math.floor(R() * maskPool.length)],
  }));

  const mirrorsPct: { center: Vec; lenPct: number; deg: number }[] = [
    { center: randPct(R, 0.10, 0.12), lenPct: cfg.lenMain, deg: randAngle(R, -35, 35) },
    ...cfg.lenExtra.map((L) => ({ center: randPct(R, 0.10, 0.14), lenPct: L, deg: randAngle(R, -60, 60) })),
  ];

  return { frameWallsPct, innerWallsPct, filtersPct, goalPct, decoysPct, srcPct, srcDeg, mirrorsPct };
}
