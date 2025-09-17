// luch/canvas/primitives/GridAndFiltersDefs.tsx
"use client";

import React from "react";

/**
 * Лёгкие defs для сцены:
 * - Сетка: мажорные линии + микро-точки, crisp-edges, незаметна на тёмном фоне, но помогает чтению.
 * - beamGlow: аккуратное свечение без «тяжёлого» blur (малые stdDeviation, ограниченная область).
 * - star: компактный спарк-эффект для частиц.
 * Все ID сохранены (grid, beamGlow, star), чтобы не ломать существующие ссылки.
 */
export function GridAndFiltersDefs() {
  return (
    <defs>
      {/* ====== GRID (48x48 tile) ====== */}
      <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
        {/* мажорные линии по краям тайла */}
        <path
          d="M 48 0 L 0 0 0 48"
          fill="none"
          stroke="rgba(230,240,255,0.08)"
          strokeWidth="1"
          shapeRendering="crispEdges"
        />
        {/* микро-точки на 1/4 и 1/2 шага — едва заметные ориентиры */}
        <g fill="rgba(210,225,255,0.12)">
          <circle cx="12" cy="12" r="0.7" />
          <circle cx="24" cy="12" r="0.7" />
          <circle cx="36" cy="12" r="0.7" />

          <circle cx="12" cy="24" r="0.7" />
          <circle cx="24" cy="24" r="0.7" />
          <circle cx="36" cy="24" r="0.7" />

          <circle cx="12" cy="36" r="0.7" />
          <circle cx="24" cy="36" r="0.7" />
          <circle cx="36" cy="36" r="0.7" />
        </g>
      </pattern>

      {/* ====== BEAM GLOW (лёгкое) ======
          Сохраняем id="beamGlow", но делаем эффект дешевле:
          - Малая размытие (3/6 вместо 8/16)
          - Ограниченная область фильтра уменьшает перерисовку */}
      <filter
        id="beamGlow"
        x="-40%" y="-40%" width="180%" height="180%"
        colorInterpolationFilters="sRGB"
      >
        {/* лёгкое размытие в два слоя */}
        <feGaussianBlur stdDeviation="3" result="b1" />
        <feGaussianBlur stdDeviation="6" result="b2" />
        {/* мягкий буст яркости без резких колор-сдвигов */}
        <feColorMatrix
          in="b2"
          type="matrix"
          values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            0 0 0 0.85 0"            /* слегка уменьшили альфу свечения */
          result="b2c"
        />
        <feMerge>
          <feMergeNode in="b2c" />
          <feMergeNode in="b1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* ====== STAR (спарк для искр) ====== */}
      <filter
        id="star"
        x="-120%" y="-120%" width="260%" height="260%"
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur stdDeviation="1.2" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* (опционально) Градиенты для синих/красных/зелёных штрихов лучей — можно использовать по желанию */}
      <linearGradient id="beamBlue" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#9fd6ff" stopOpacity="1" />
        <stop offset="100%" stopColor="#9fd6ff" stopOpacity="0.0" />
      </linearGradient>
      <linearGradient id="beamRed" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#ff8aa1" stopOpacity="1" />
        <stop offset="100%" stopColor="#ff8aa1" stopOpacity="0.0" />
      </linearGradient>
      <linearGradient id="beamGreen" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#9dffc9" stopOpacity="1" />
        <stop offset="100%" stopColor="#9dffc9" stopOpacity="0.0" />
      </linearGradient>
    </defs>
  );
}
