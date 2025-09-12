"use client";

import { useEffect } from "react";
import { MirrorSpec } from "../../engine/types";
import { clampPct, deg, toPct, toPx } from "../../engine/utils";

export type DragState =
  | { type: "none" }
  | { type: "srcRot" }
  | { type: "mirrorRot"; id: string }
  | { type: "mirrorMove"; id: string }
  | { type: "filterMove"; id: string };

export function useDragHandlers({
  wrapRef, drag, setDrag, size, sourcePx,
  mainMirror, extraMirrorsPct,
  setSourceDeg, rotateById, moveMirrorById, updateFilterPos,
}: {
  wrapRef: React.RefObject<HTMLDivElement | null>;
  drag: DragState;
  setDrag: (d: DragState) => void;
  size: { w: number; h: number };
  sourcePx: { x: number; y: number };
  mainMirror: MirrorSpec;
  extraMirrorsPct: MirrorSpec[];
  setSourceDeg: (d: number) => void;
  rotateById: (id: string, deltaDeg: number) => void;
  moveMirrorById: (id: string, c: { x: number; y: number }) => void;
  updateFilterPos: (id: string, c: { x: number; y: number }) => void;
}) {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (drag.type === "none") return;
      const svg = wrapRef.current?.querySelector("svg");
      const rect = svg?.getBoundingClientRect();
      if (!rect) return;

      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      if (drag.type === "srcRot") {
        const v = { x: px - sourcePx.x, y: py - sourcePx.y };
        setSourceDeg(deg(Math.atan2(v.y, v.x)));
        return;
      }

      if (drag.type === "mirrorRot") {
        const isMain = drag.id === mainMirror.id;
        const centerPct = isMain
          ? mainMirror.center
          : extraMirrorsPct.find((m) => m.id === drag.id)!.center;
        const centerPx = toPx(centerPct, size.w, size.h);
        const v = { x: px - centerPx.x, y: py - centerPx.y };
        const nd = deg(Math.atan2(v.y, v.x));
        const currentDeg = isMain
          ? mainMirror.deg
          : extraMirrorsPct.find((m) => m.id === drag.id)!.deg;
        rotateById(drag.id, nd - currentDeg);
        return;
      }

      if (drag.type === "mirrorMove") {
        moveMirrorById(drag.id, clampPct(toPct({ x: px, y: py }, size.w, size.h)));
        return;
      }

      if (drag.type === "filterMove") {
        updateFilterPos(drag.id, clampPct(toPct({ x: px, y: py }, size.w, size.h)));
        return;
      }
    };

    const onUp = () => setDrag({ type: "none" });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [
    drag, wrapRef, size.w, size.h, sourcePx.x, sourcePx.y,
    mainMirror.id, mainMirror.center.x, mainMirror.center.y, mainMirror.deg,
    extraMirrorsPct, setSourceDeg, rotateById, moveMirrorById, updateFilterPos,
  ]);
}
