// luch/canvas/render/Walls.tsx
"use client";

import React from "react";
import { SegmentObj } from "../../engine/types";

/**
 * Лёгкая «глубина» стен: двойной штрих.
 * 1) Подложка (темнее и толще) — создаёт тень.
 * 2) Верхний штрих (светлее и тоньше) — ребро, читается на тёмном фоне.
 */
export function Walls({
  frameWalls,
  innerWalls,
}: {
  frameWalls: SegmentObj[];
  innerWalls: SegmentObj[];
}) {
  // Палитра под тёмный фон
  const baseDark = "rgba(255,255,255,0.10)";
  const baseLight = "rgba(220,235,255,0.45)";
  const innerDark = "rgba(200,210,255,0.08)";
  const innerLight = "rgba(200,220,255,0.32)";

  const drawPair = (s: SegmentObj, dark: string, light: string, wDark: number, wLight: number) => (
    <g key={s.id}>
      <line
        x1={s.A.x} y1={s.A.y} x2={s.B.x} y2={s.B.y}
        stroke={dark}
        strokeWidth={wDark}
        strokeLinecap="round"
      />
      <line
        x1={s.A.x} y1={s.A.y} x2={s.B.x} y2={s.B.y}
        stroke={light}
        strokeWidth={wLight}
        strokeLinecap="round"
      />
    </g>
  );

  return (
    <>
      {/* Рамка: заметнее, но всё ещё деликатная */}
      {frameWalls.map((s) => drawPair(s, baseDark, baseLight, 6.5, 4.5))}

      {/* Внутренние перегородки: чуть слабее */}
      {innerWalls.map((s) => drawPair(s, innerDark, innerLight, 6, 4))}
    </>
  );
}
