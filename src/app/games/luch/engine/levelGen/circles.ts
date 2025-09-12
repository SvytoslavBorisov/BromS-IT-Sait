// engine/levelGen/circles.ts
import { CircleObj, Difficulty, PctPoint } from "../types";
import { FILTER_RADIUS_MIN, FILTER_RADIUS_MAX, PLACE_TRIES, RGB_BITS } from "../constants";
import { genId, randBetween, randInt } from "../utils";
import { randPctWithPad, dist2 } from "./points";

function circleOverlapsAny(
  c: { C: PctPoint; r: number },
  others: CircleObj[],
  pad = 0.01
): boolean {
  for (const o of others) {
    const rr = c.r + o.r + pad;
    if (dist2(c.C, o.C) <= rr * rr) return true;
  }
  return false;
}

export function placeCircleNonOverlapping(
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

export function buildGoal(difficulty: Difficulty): CircleObj {
  const goal: CircleObj = {
    id: genId("goal"),
    kind: "goal",
    C: randPctWithPad(),
    r: 0.06,
  };
  return goal;
}

export function ensureRequiredFilters(
  circles: CircleObj[],
  requiredMask: number,
  difficulty: Difficulty
): CircleObj[] {
  const haveMask = circles
    .filter((c) => c.kind === "filter")
    .reduce((acc, c) => acc | (c.mask ?? 0), 0);

  const needBits = RGB_BITS.filter((b) => (requiredMask & b) !== 0 && (haveMask & b) === 0);
  if (needBits.length === 0) return circles;

  const baseR = randBetween(
    FILTER_RADIUS_MIN * (difficulty === "hard" ? 0.9 : 1),
    FILTER_RADIUS_MAX * (difficulty === "hard" ? 0.9 : 1),
  );

  const out = circles.slice();
  for (const bit of needBits) {
    const c = placeCircleNonOverlapping(out, "filter", baseR, { mask: bit });
    out.push(
      c ?? {
        id: genId("filter"),
        kind: "filter",
        C: randPctWithPad(),
        r: baseR,
        mask: bit,
      }
    );
  }
  return out;
}

export function randomFilters(count: number): CircleObj[] {
  return Array.from({ length: count }).map(() => ({
    id: genId("filter"),
    kind: "filter",
    C: randPctWithPad(),
    r: randBetween(FILTER_RADIUS_MIN, FILTER_RADIUS_MAX),
    mask: [1, 2, 4][randInt(0, 2)], // COLOR_R/G/B
  }));
}

export function randomDecoys(count: number): CircleObj[] {
  return Array.from({ length: count }).map(() => ({
    id: genId("decoy"),
    kind: "decoy",
    C: randPctWithPad(),
    r: randBetween(FILTER_RADIUS_MIN * 0.8, FILTER_RADIUS_MIN * 1.2),
  }));
}
