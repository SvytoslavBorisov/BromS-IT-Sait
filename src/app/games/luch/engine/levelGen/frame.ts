// engine/levelGen/frame.ts
import { SegmentObj } from "../types";
import { BORDER_PAD_PCT } from "../constants";
import { genId } from "../utils";

export function makeFrame(): SegmentObj[] {
  const A = { x: BORDER_PAD_PCT, y: BORDER_PAD_PCT };
  const B = { x: 1 - BORDER_PAD_PCT, y: BORDER_PAD_PCT };
  const C = { x: 1 - BORDER_PAD_PCT, y: 1 - BORDER_PAD_PCT };
  const D = { x: BORDER_PAD_PCT, y: 1 - BORDER_PAD_PCT };
  return [
    { id: genId("wall"), kind: "wall", A,     B     },
    { id: genId("wall"), kind: "wall", A: B,  B: C  },
    { id: genId("wall"), kind: "wall", A: C,  B: D  },
    { id: genId("wall"), kind: "wall", A: D,  B: A  },
  ];
}
