// luch/state/placement.ts
import { SegmentObj } from "../engine/types";
import { genId } from "../engine/utils";

export function addPlacedReflector(
  prev: SegmentObj[],
  A: { x: number; y: number },
  B: { x: number; y: number }
): SegmentObj[] {
  return [...prev, { id: genId("place"), kind: "mirror", A, B }];
}
