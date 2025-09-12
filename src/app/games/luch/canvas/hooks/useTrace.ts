"use client";

import { useMemo } from "react";
import { CircleObj, SegmentObj, RaySeg, Vec } from "../../engine/types";
import { traceRay } from "../../engine/physics";

export function useTrace({
  size, sourcePx, srcDir,
  wallsPx, mirrorsPx, circlesPx,
  mirrorMainPx, extraMirrorsPx, placedReflectorsPx,
  maxBounces,
}: {
  size: { w: number; h: number };
  sourcePx: Vec;
  srcDir: Vec;
  wallsPx: SegmentObj[];
  mirrorsPx: SegmentObj[];
  circlesPx: CircleObj[];
  mirrorMainPx: SegmentObj;
  extraMirrorsPx: SegmentObj[];
  placedReflectorsPx?: SegmentObj[];
  maxBounces: number;
}) {
  // Стабильный ключ чтобы не считать трассировку лишний раз
  const traceKey = useMemo(() => {
    const wallsK = wallsPx.map((s) => `${s.id}:${s.A.x},${s.A.y},${s.B.x},${s.B.y}`).join("|");
    const mirK = mirrorsPx.map((s) => `${s.id}:${s.A.x},${s.A.y},${s.B.x},${s.B.y}`).join("|");
    const circK = circlesPx
      .map((c) => `${c.id}:${c.kind}:${c.C.x},${c.C.y},${c.r}:${c.mask ?? 0}:${c.requiredMask ?? 0}`)
      .join("|");
    return `${size.w}x${size.h};src:${sourcePx.x},${sourcePx.y};dir:${srcDir.x},${srcDir.y};W:${wallsK};M:${mirK};C:${circK}`;
  }, [size.w, size.h, sourcePx.x, sourcePx.y, srcDir.x, srcDir.y, wallsPx, mirrorsPx, circlesPx]);

  const result = useMemo(() => {
    const minSide = Math.min(size.w, size.h);
    return traceRay({
      sourcePx,
      srcDir,
      walls: wallsPx,
      mirrors: mirrorsPx,
      circles: circlesPx,
      maxBounces,
      eps: Math.max(0.001 * minSide, 0.75),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traceKey]);

  return result;
}
