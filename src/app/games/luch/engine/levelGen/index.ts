// engine/levelGen/index.ts
import {
  CircleObj,
  MirrorSpec,
  SegmentObj,
  LevelSpec,
  Difficulty,
} from "../types";
import { COLOR_R, COLOR_G, COLOR_B, RGB_BITS } from "../constants";
import { genId, randBetween, randInt } from "../utils";

import { randPctWithPad } from "./points";
import { makeFrame } from "./frame";
import {
  buildGoal,
  ensureRequiredFilters,
  randomDecoys,
  randomFilters,
} from "./circles";
import {
  mirrorsCountByDifficulty,
  filtersCountByDifficulty,
  decoysCountByDifficulty,
  requiredBitsCountByDifficulty,
} from "./rules";

export function generateLevel(seed: string, difficulty: Difficulty): LevelSpec {
  // Источник
  const srcPct = randPctWithPad();
  const srcDeg = randBetween(-180, 180);

  // Зеркала
  const mainMirror: MirrorSpec = {
    id: genId("mirrorMain"),
    center: randPctWithPad(),
    deg: randBetween(-180, 180),
    lenPct: 0.22,
  };

  const extraMirrorsPct: MirrorSpec[] = Array.from({
    length: mirrorsCountByDifficulty(difficulty),
  }).map(() => ({
    id: genId("mirror"),
    center: randPctWithPad(),
    deg: randBetween(-180, 180),
    lenPct: randBetween(0.14, 0.18),
  }));

  // Стены
  const frameWallsPct = makeFrame();
  const innerWallsPct: SegmentObj[] = [];
  if (difficulty !== "easy") {
    innerWallsPct.push({
      id: genId("wall"),
      kind: "wall",
      A: { x: 0.35, y: 0.25 },
      B: { x: 0.75, y: 0.25 },
    });
  }
  if (difficulty === "hard") {
    innerWallsPct.push({
      id: genId("wall"),
      kind: "wall",
      A: { x: 0.6, y: 0.55 },
      B: { x: 0.6, y: 0.85 },
    });
  }

  // Маска цели
  const requireBitsCount = requiredBitsCountByDifficulty(difficulty, randInt);
  const bitsPool = [...RGB_BITS];
  let requiredMask = 0;
  for (let i = 0; i < requireBitsCount && bitsPool.length; i++) {
    const take = bitsPool.splice(randInt(0, bitsPool.length - 1), 1)[0];
    requiredMask |= take;
  }

  const goalPct: CircleObj = { ...buildGoal(difficulty), requiredMask };

  // Фильтры и обманки
  const filtersPct = randomFilters(filtersCountByDifficulty(difficulty));
  const decoysPct = randomDecoys(decoysCountByDifficulty(difficulty));

  // Догенерация недостающих фильтров под нужные биты
  const allCircles = ensureRequiredFilters([...filtersPct, ...decoysPct, goalPct], requiredMask, difficulty);

  // Итоговый объект — тип LevelSpec (с seed и difficulty!)
  return {
    seed,
    difficulty,
    srcPct,
    srcDeg,
    mirrorsPct: [mainMirror, ...extraMirrorsPct],
    frameWallsPct,
    innerWallsPct,
    filtersPct: allCircles.filter(c => c.kind === "filter"),
    decoysPct: allCircles.filter(c => c.kind === "decoy"),
    goalPct,
  };
}
