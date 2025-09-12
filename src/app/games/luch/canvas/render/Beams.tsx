"use client";

import React from "react";
import { RaySeg } from "../../engine/types";

export function Beams({
  segments, sparks, maskToHex, compact, pointKey,
}: {
  segments: RaySeg[];
  sparks: { x: number; y: number; col: number }[];
  maskToHex: (mask: number) => string;
  compact: boolean;
  pointKey: (...args: any[]) => string;
}) {
  return (
    <>
      {segments.map((s) => {
        const k = `seg-${pointKey(s.A.x, s.A.y, pointKey(s.B.x, s.B.y))}`;
        const col = s.mask === 0 ? "rgba(255,255,255,0.22)" : maskToHex(s.mask);
        return (
          <g key={k} filter="url(#beamGlow)">
            <line
              x1={s.A.x} y1={s.A.y} x2={s.B.x} y2={s.B.y}
              stroke={col} strokeWidth={compact ? 7 : 8} strokeLinecap="round" opacity={0.96}
            />
          </g>
        );
      })}

      {sparks.map((p) => {
        const k = `sp-${pointKey(p.x, p.y, String(p.col))}`;
        const col = p.col ? maskToHex(p.col) : "#ffffff";
        return (
          <g key={k} filter="url(#star)">
            <circle cx={p.x} cy={p.y} r={compact ? 6 : 8} fill={col} opacity={0.55}/>
            <circle cx={p.x} cy={p.y} r={compact ? 14 : 18} fill={col} opacity={0.12}/>
          </g>
        );
      })}
    </>
  );
}