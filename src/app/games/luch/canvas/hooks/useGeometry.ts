"use client";

import { useMemo } from "react";
import { CircleObj, MirrorSpec, SegmentObj } from "../../engine/types";
import { rad, toPx } from "../../engine/utils";

export function useGeometry({
  size,
  sourcePct, sourceDeg,
  mainMirror, extraMirrorsPct,
  frameWallsPct, innerWallsPct,
  circlesPct, placedReflectorsPct,
}: {
  size: { w: number; h: number };
  sourcePct: { x: number; y: number };
  sourceDeg: number;
  mainMirror: MirrorSpec;
  extraMirrorsPct: MirrorSpec[];
  frameWallsPct: SegmentObj[];
  innerWallsPct: SegmentObj[];
  circlesPct: CircleObj[];
  placedReflectorsPct: SegmentObj[];
}) {
  const sourcePx = useMemo(
    () => toPx(sourcePct, size.w, size.h),
    [sourcePct, size.w, size.h]
  );
  const srcDir = useMemo(
    () => ({ x: Math.cos(rad(sourceDeg)), y: Math.sin(rad(sourceDeg)) }),
    [sourceDeg]
  );

  const mirrorMainPx: SegmentObj = useMemo(() => {
    const halfLen = (mainMirror.lenPct ?? 0.2) * size.w * 0.5;
    const a = rad(mainMirror.deg);
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    const c = toPx(mainMirror.center, size.w, size.h);
    return {
      id: mainMirror.id,
      kind: "mirror",
      A: { x: c.x - dir.x * halfLen, y: c.y - dir.y * halfLen },
      B: { x: c.x + dir.x * halfLen, y: c.y + dir.y * halfLen },
    };
  }, [mainMirror.center.x, mainMirror.center.y, mainMirror.deg, mainMirror.lenPct, mainMirror.id, size.w, size.h]);

  const extraMirrorsPx = useMemo<SegmentObj[]>(
    () =>
      extraMirrorsPct.map((m) => {
        const c = toPx(m.center, size.w, size.h);
        const half = (m.lenPct ?? 0.16) * size.w * 0.5;
        const a = rad(m.deg);
        const d = { x: Math.cos(a), y: Math.sin(a) };
        return {
          id: m.id,
          kind: "mirror",
          A: { x: c.x - d.x * half, y: c.y - d.y * half },
          B: { x: c.x + d.x * half, y: c.y + d.y * half },
        };
      }),
    [extraMirrorsPct, size.w, size.h]
  );

  const frameWalls = useMemo<SegmentObj[]>(
    () =>
      frameWallsPct.map((s) => ({
        ...s,
        A: toPx(s.A, size.w, size.h),
        B: toPx(s.B, size.w, size.h),
      })),
    [frameWallsPct, size.w, size.h]
  );
  const innerWalls = useMemo<SegmentObj[]>(
    () =>
      innerWallsPct.map((s) => ({
        ...s,
        A: toPx(s.A, size.w, size.h),
        B: toPx(s.B, size.w, size.h),
      })),
    [innerWallsPct, size.w, size.h]
  );
  const wallsPx = useMemo<SegmentObj[]>(() => [...frameWalls, ...innerWalls], [frameWalls, innerWalls]);

  const circlesPx = useMemo<CircleObj[]>(
    () =>
      circlesPct.map((c) => ({
        ...c,
        C: toPx(c.C, size.w, size.h),
        r: c.r * Math.min(size.w, size.h),
      })),
    [circlesPct, size.w, size.h]
  );

  const placedReflectorsPx = useMemo<SegmentObj[]>(
    () =>
      placedReflectorsPct.map((m) => ({
        ...m,
        A: toPx(m.A, size.w, size.h),
        B: toPx(m.B, size.w, size.h),
      })),
    [placedReflectorsPct, size.w, size.h]
  );

  const mirrorsAllPx = useMemo(
    () => [mirrorMainPx, ...extraMirrorsPx, ...placedReflectorsPx],
    [mirrorMainPx, extraMirrorsPx, placedReflectorsPx]
  );

  return {
    size,
    sourcePx, srcDir,
    mirrorMainPx, extraMirrorsPx,
    frameWalls, innerWalls, wallsPx,
    circlesPx,
    placedReflectorsPx,
    mirrorsAllPx,
  };
}
