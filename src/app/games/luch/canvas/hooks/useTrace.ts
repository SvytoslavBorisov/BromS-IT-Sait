"use client";

import { useMemo } from "react";
import { CircleObj, SegmentObj, RaySeg, Vec } from "../../engine/types";
import { traceRay } from "../../engine/physics";

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

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
  // Стабильный ключ, чтобы не пересчитывать трассировку лишний раз
  const traceKey = useMemo(() => {
    const wallsK = wallsPx.map((s) => `${s.id}:${s.A.x},${s.A.y},${s.B.x},${s.B.y}`).join("|");
    const mirK   = mirrorsPx.map((s) => `${s.id}:${s.A.x},${s.A.y},${s.B.x},${s.B.y}`).join("|");
    const circK  = circlesPx
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

  // ВАЖНО: segments — это RaySeg[], а не SegmentObj[]
  const segments: RaySeg[] = (result?.segments ?? []) as RaySeg[];

  const totalLength = useMemo(() => {
    let sum = 0;
    for (const s of segments) {
      // У RaySeg точки называются A/B (заглавные)
      sum += dist(s.A, s.B);
    }
    return sum;
  }, [segments]);

  // Возвращаем прежний результат + totalLength (неломающий апи)
  return useMemo(() => ({ ...result, totalLength }), [result, totalLength]);
}
