// engine/levelGen/rules.ts
import { Difficulty } from "../types";

export function mirrorsCountByDifficulty(d: Difficulty): number {
  if (d === "easy") return 1;
  if (d === "normal") return 2;
  return 3; // hard
}

export function filtersCountByDifficulty(d: Difficulty): number {
  if (d === "easy") return 1;
  if (d === "normal") return 2;
  return 3; // hard
}

export function decoysCountByDifficulty(d: Difficulty): number {
  if (d === "hard") return 2;
  return 1; // easy/normal
}

export function requiredBitsCountByDifficulty(d: Difficulty, randInt: (a:number,b:number)=>number): number {
  if (d === "easy") return 1;
  if (d === "normal") return randInt(1, 2);
  return randInt(2, 3); // hard
}

export function filterRadiusMultiplier(d: Difficulty): number {
  if (d === "hard") return 0.9;
  return 1; // easy/normal
}
