"use client";

import React from "react";

export function Source({
  compact, sourcePx, srcDir, onPick,
}: {
  compact: boolean;
  sourcePx: { x: number; y: number };
  srcDir: { x: number; y: number };
  onPick: () => void;
}) {
  return (
    <g
      onPointerDown={(e) => {
        e.preventDefault();
        onPick();
      }}
      style={{ cursor: "grab" }}
    >
      <circle cx={sourcePx.x} cy={sourcePx.y} r={compact ? 12 : 13} fill="#ffffff" />
      <line
        x1={sourcePx.x} y1={sourcePx.y}
        x2={sourcePx.x + srcDir.x * (compact ? 30 : 34)}
        y2={sourcePx.y + srcDir.y * (compact ? 30 : 34)}
        stroke="#ff5fff" strokeWidth={3} strokeLinecap="round"
      />
    </g>
  );
}
