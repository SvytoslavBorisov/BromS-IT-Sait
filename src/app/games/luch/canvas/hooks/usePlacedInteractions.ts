// luch/canvas/hooks/usePlacedInteractions.ts
"use client";

import { useMemo, useRef, useState } from "react";
import { SegmentObj } from "../../engine/types";

type Size = { w: number; h: number };

export default function usePlacedInteractions({
  size, placedReflectorsPct, movePlacedById, rotatePlacedById,
}: {
  size: Size;
  placedReflectorsPct: SegmentObj[];
  movePlacedById: (id: string, c: { x: number; y: number }) => void;
  rotatePlacedById: (id: string, deltaDeg: number) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pointerCaptured = useRef(false);
  const DRAG_TOL = 1.2; // % толщина «подхвата»

  const distPointToSeg = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const vx = b.x - a.x, vy = b.y - a.y;
    const wx = p.x - a.x, wy = p.y - a.y;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y);
    const t = c1 / c2;
    const proj = { x: a.x + t * vx, y: a.y + t * vy };
    return Math.hypot(p.x - proj.x, p.y - proj.y);
  };

  const hitPlaced = (pxPct: number, pyPct: number) => {
    for (const s of placedReflectorsPct) {
      if (distPointToSeg({ x: pxPct, y: pyPct }, s.A, s.B) <= DRAG_TOL) return s.id;
    }
    return null;
  };

  const toPct = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - r.left) / r.width) * 100;
    const yPct = ((e.clientY - r.top) / r.height) * (100 * size.h / size.w);
    return { x: xPct, y: yPct };
    // масштаб по y учитывает viewBox=0..w,0..h → мы приводим к «100 x H%»
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const { x, y } = toPct(e);
    const id = hitPlaced(x, y);
    setSelectedId(id);
    if (id) {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
      pointerCaptured.current = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!selectedId) return;
    const { x, y } = toPct(e);
    movePlacedById(selectedId, { x, y });
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    setSelectedId(null);
    if (pointerCaptured.current) {
      (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
      pointerCaptured.current = false;
    }
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (!selectedId) return;
    e.preventDefault();
    rotatePlacedById(selectedId, e.deltaY < 0 ? 5 : -5); // шаг 5°
  };

  return { selectedId, onPointerDown, onPointerMove, onPointerUp, onWheel };
}
