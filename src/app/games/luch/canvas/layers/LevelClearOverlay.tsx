// luch/canvas/layers/LevelClearOverlay.tsx
"use client";

import React from "react";

export default function LevelClearOverlay({
  hit, size, maskToHex, circlesPx, totalLength,
}: {
  hit: boolean;
  size: { w: number; h: number };
  maskToHex: (mask: number) => string;
  circlesPx: Array<{ id: string; kind: string; C: { x: number; y: number }; r: number; requiredMask?: number }>;
  totalLength?: number; // <-- добавили
}) {
  if (!hit) return null;
  const goal = circlesPx.find((c) => c.kind === "goal");
  const cx = goal?.C.x ?? size.w / 2;
  const cy = goal?.C.y ?? size.h / 2;
  const r0 = goal?.r ?? Math.min(size.w, size.h) * 0.05;
  const col = maskToHex(goal?.requiredMask ?? 0);

  return (
    <g aria-label="level-clear">
      {/* мягкое затемнение */}
      <rect x={0} y={0} width={size.w} height={size.h} fill="rgba(0,0,0,0.35)">
        <animate attributeName="opacity" values="0;0.35" dur="0.25s" fill="freeze" />
      </rect>

      {/* пульсирующие кольца */}
      {[0, 0.35, 0.7].map((delay, i) => (
        <circle key={`clear-ring-${i}`} cx={cx} cy={cy} r={r0} stroke={col} strokeWidth={3} fill="none" opacity={0.85}>
          <animate attributeName="r" values={`${r0}; ${Math.max(size.w, size.h)}`} dur="1.6s" begin={`${delay}s`} />
          <animate attributeName="opacity" values="0.85; 0" dur="1.6s" begin={`${delay}s`} />
        </circle>
      ))}

      {/* надпись */}
      <text
        x={size.w / 2}
        y={size.h / 2}
        textAnchor="middle"
        style={{ fontWeight: 900, letterSpacing: 2 }}
        fontSize={28}
        fill="#ffffff"
      >
        LEVEL CLEAR
        <animate attributeName="opacity" values="0;1;1" dur="0.8s" fill="freeze" />
      </text>

      {/* длина луча */}
      {typeof totalLength === "number" && (
        <text
          x={size.w / 2}
          y={size.h / 2 + 22}
          textAnchor="middle"
          style={{ fontWeight: 700, letterSpacing: 0.5 }}
          fontSize={14}
          fill="rgba(255,255,255,0.95)"
        >
          Длина луча: {totalLength.toFixed(1)}
        </text>
      )}

      <text
        x={size.w / 2}
        y={size.h / 2 + 44}
        textAnchor="middle"
        style={{ fontWeight: 700, letterSpacing: 1 }}
        fontSize={13}
        fill="rgba(255,255,255,0.9)"
      >
        Нажми «Новый уровень» вверху, чтобы продолжить
      </text>
    </g>
  );
}
