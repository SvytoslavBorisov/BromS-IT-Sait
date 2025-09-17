// luch/canvas/render/Source.tsx
"use client";

import React, { useMemo } from "react";

export function Source({
  compact, sourcePx, srcDir, onPick,
}: {
  compact: boolean;
  sourcePx: { x: number; y: number };
  srcDir: { x: number; y: number };
  onPick: () => void;
}) {
  const beamLen = compact ? 34 : 40;

  // Конец луча + градиент для штриха (userSpaceOnUse — координаты в px)
  const tip = useMemo(
    () => ({ x: sourcePx.x + srcDir.x * beamLen, y: sourcePx.y + srcDir.y * beamLen }),
    [sourcePx.x, sourcePx.y, srcDir.x, srcDir.y, beamLen]
  );

  const gradId = useMemo(
    () => `beamGrad-${Math.round(sourcePx.x)}-${Math.round(sourcePx.y)}-${Math.round(tip.x)}-${Math.round(tip.y)}`,
    [sourcePx.x, sourcePx.y, tip.x, tip.y]
  );

  const rOuter = compact ? 13 : 14;
  const rInner = compact ? 7.5 : 8.5;

  return (
    <g
      onPointerDown={(e) => { e.preventDefault(); onPick(); }}
      style={{ cursor: "grab" }}
    >
      <defs>
        {/* Луч: яркий у источника, к концу растворяется */}
        <linearGradient id={gradId} x1={sourcePx.x} y1={sourcePx.y} x2={tip.x} y2={tip.y} gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="#ff6ad5" stopOpacity="1" />
          <stop offset="55%" stopColor="#86b9ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#86b9ff" stopOpacity="0.0" />
        </linearGradient>

        {/* Мягкий ореол вокруг эмиттера без blur — два концентрических круга */}
        <radialGradient id="srcGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.95)" />
          <stop offset="60%"  stopColor="rgba(210,230,255,0.55)" />
          <stop offset="100%" stopColor="rgba(140,170,255,0.00)" />
        </radialGradient>
      </defs>

      {/* Хит-зона побольше, чтобы удобно хватать */}
      <circle cx={sourcePx.x} cy={sourcePx.y} r={rOuter + 10} fill="transparent" />

      {/* Ореол */}
      <circle cx={sourcePx.x} cy={sourcePx.y} r={rOuter * 1.9} fill="url(#srcGlow)" opacity={0.9} />

      {/* Корпус источника: обод + сердцевина */}
      <circle cx={sourcePx.x} cy={sourcePx.y} r={rOuter} fill="#111826" stroke="rgba(255,255,255,0.16)" strokeWidth={1.5} />
      <circle cx={sourcePx.x} cy={sourcePx.y} r={rInner} fill="#eaf1ff" />
      <circle cx={sourcePx.x} cy={sourcePx.y} r={rInner - 3} fill="#b9d0ff" />

      {/* Луч */}
      <line
        x1={sourcePx.x} y1={sourcePx.y}
        x2={tip.x}      y2={tip.y}
        stroke={`url(#${gradId})`}
        strokeWidth={compact ? 4.5 : 5}
        strokeLinecap="round"
      />

      {/* Небольший «наконечник» на конце луча */}
      <circle cx={tip.x} cy={tip.y} r={compact ? 2.2 : 2.6} fill="#bfe0ff" />
    </g>
  );
}
