"use client";
import React from "react";

export function TargetIcon({ x, y, active, size = 22 }: { x: number; y: number; active: boolean; size?: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* внешнее кольцо */}
      <circle
        r={size}
        fill="none"
        stroke={active ? "#00ffcc" : "#888"}
        strokeWidth={3}
      />
      {/* внутренняя точка */}
      <circle
        r={size * 0.5}
        fill={active ? "url(#targetActive)" : "#555"}
      />
      {/* анимация активации */}
      {active && (
        <circle r={size * 0.5} fill="none" stroke="#00ffcc" strokeWidth={2}>
          <animate attributeName="r" values={`${size * 0.5};${size * 1.2}`} dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;0" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}
