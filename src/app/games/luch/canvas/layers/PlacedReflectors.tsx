// luch/canvas/layers/PlacedReflectors.tsx
"use client";

import React from "react";
import { SegmentObj } from "../../engine/types";

export default function PlacedReflectors({
  reflectors,
  selectedId,
  onPick, // (id, e)
}: {
  reflectors: (SegmentObj & { A: { x: number; y: number }; B: { x: number; y: number } })[];
  selectedId: string | null;
  onPick: (id: string, e: React.PointerEvent<SVGLineElement>) => void;
}) {
  return (
    <g aria-label="placed-reflectors">
      {reflectors.map((m) => {
        const isSel = m.id === selectedId;
        const stroke = isSel ? "#c2ffe1" : "#90f0a5";
        const w1 = isSel ? 8.5 : 7;
        const w2 = isSel ? 5.5 : 4.5;
        return (
          <g key={m.id}>
            {/* Подложка-тень */}
            <line
              x1={m.A.x} y1={m.A.y} x2={m.B.x} y2={m.B.y}
              stroke="rgba(0,0,0,0.35)"
              strokeWidth={w1 + 2}
              strokeLinecap="round"
              pointerEvents="none"
            />
            {/* Основной штрих — ловим клики по stroke */}
            <line
              x1={m.A.x} y1={m.A.y} x2={m.B.x} y2={m.B.y}
              stroke={stroke}
              strokeWidth={w1}
              strokeLinecap="round"
              pointerEvents="stroke"
              onPointerDown={(e) => onPick(m.id, e)}
            />
            {/* Ребро-свет */}
            <line
              x1={m.A.x} y1={m.A.y} x2={m.B.x} y2={m.B.y}
              stroke="rgba(255,255,255,0.45)"
              strokeWidth={w2}
              strokeLinecap="round"
              opacity={0.35}
              pointerEvents="none"
            />
          </g>
        );
      })}
    </g>
  );
}
