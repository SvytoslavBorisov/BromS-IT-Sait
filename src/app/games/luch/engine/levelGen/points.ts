// engine/levelGen/points.ts
import { PctPoint } from "../types";
import { BORDER_PAD_PCT } from "../constants";
import { randBetween } from "../utils";

export function randPctWithPad(): PctPoint {
  const min = BORDER_PAD_PCT;
  const max = 1 - BORDER_PAD_PCT;
  return { x: randBetween(min, max), y: randBetween(min, max) };
}

export function dist2(a: PctPoint, b: PctPoint) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
