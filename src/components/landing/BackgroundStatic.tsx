// components/BackgroundGridLight.tsx
"use client";

import React from "react";

/**
 * Лёгкий статичный фон: линейный градиент + сетка + белый fade по краям.
 * Убираем верхнюю и нижнюю линии сетки.
 */
export default function BackgroundGridLight({
  className = "",
  mask = true, // мягкая маска сверху (как в HeroSection)
}: { className?: string; mask?: boolean }) {
  // сетка: 10 вертикалей и 6 горизонталей, но без y=0 и y=800
  const vs = Array.from({ length: 10 }, (_, i) => (i * 1200) / 9);
  const hs = Array.from({ length: 6 }, (_, i) => (i * 800) / 5).filter(
    (y) => y > 0 && y < 800
  );

  return (
    <svg
      className={`absolute inset-0 -z-20 h-full w-full pointer-events-none ${
        mask
          ? "[mask-image:radial-gradient(1200px_800px_at_50%_30%,white,transparent_80%)]"
          : ""
      } ${className}`}
      viewBox="0 0 1200 800"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        {/* основа: диагональный градиент */}
        <linearGradient id="bg-grid-lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>

        {/* белый fade по краям */}
        <radialGradient
          id="bg-fade"
          cx="50%"
          cy="50%"
          r="80%"
          fx="50%"
          fy="50%"
        >
          <stop offset="70%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="white" stopOpacity="1" />
        </radialGradient>
      </defs>

      {/* фон */}
      <rect x="0" y="0" width="1200" height="800" fill="url(#bg-grid-lg)" />
      {/* белый оверлей по краям */}
      <rect x="0" y="0" width="1200" height="800" fill="url(#bg-fade)" />

      {/* сетка */}
      <g stroke="rgba(0,0,0,0.05)" strokeWidth="1">
        {vs.map((x) => (
          <path key={`v-${x}`} d={`M ${x} 0 L ${x} 800`} />
        ))}
        {hs.map((y) => (
          <path key={`h-${y}`} d={`M 0 ${y} L 1200 ${y}`} />
        ))}
      </g>
    </svg>
  );
}
