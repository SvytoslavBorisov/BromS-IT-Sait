"use client";

import React from "react";
import type { PassRow } from "../hooks/usePlayerPasses";
import { HIT_STROKE, STYLES } from "../lib/passDrawing";

type HoverState = { i: number; x: number; y: number } | null;

export function usePassLayers(
  passes: PassRow[],
  setHover: React.Dispatch<React.SetStateAction<HoverState>>,
  idPrefix = ""
) {
  // Вместо JSX.Element[] используем React.ReactElement[] — уходит TS2503
  const fail: React.ReactElement[] = [];
  const succ: React.ReactElement[] = [];
  const keyA: React.ReactElement[] = [];

  function onEnterFactory(i: number) {
    return (e: React.MouseEvent<SVGLineElement>) => {
      const svg = e.currentTarget.ownerSVGElement as SVGSVGElement;
      const rect = svg.getBoundingClientRect();
      setHover({ i, x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
  }
  function onMove(e: React.MouseEvent<SVGLineElement>) {
    const svg = e.currentTarget.ownerSVGElement as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    setHover((h) => (h ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top } : null));
  }
  function onLeave() {
    setHover(null);
  }

  for (let i = 0; i < passes.length; i++) {
    const p = passes[i];

    const baseProps = {
      x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2,
      onMouseEnter: onEnterFactory(i),
      onMouseMove: onMove,
      onMouseLeave: onLeave,
    } as const;

    // Невидимый «хитбокс» шириной HIT_STROKE
    const hit = (
      <line
        key={`h-${i}`}
        {...baseProps}
        stroke="transparent"
        strokeWidth={HIT_STROKE}
        style={{ pointerEvents: "stroke" }}
      />
    );

    if (p.key) {
      const s = STYLES.key;
      keyA.push(
        <g key={`k-${i}`}>
          <line
            {...baseProps}
            stroke={s.stroke}
            strokeWidth={s.width}
            markerEnd={`url(#${idPrefix}${s.markerId})`}
            opacity={0.95}
          />
          {hit}
        </g>
      );
    } else if (p.completed) {
      const s = STYLES.succ;
      succ.push(
        <g key={`s-${i}`}>
          <line
            {...baseProps}
            stroke={s.stroke}
            strokeWidth={s.width}
            markerEnd={`url(#${idPrefix}${s.markerId})`}
            opacity={0.92}
          />
          {hit}
        </g>
      );
    } else {
      const s = STYLES.fail;
      fail.push(
        <g key={`f-${i}`}>
          <line
            {...baseProps}
            stroke={s.stroke}
            strokeWidth={s.width}
            markerEnd={`url(#${idPrefix}${s.markerId})`}
            opacity={0.78}
          />
          {hit}
        </g>
      );
    }
  }

  return { fail, succ, keyA };
}
