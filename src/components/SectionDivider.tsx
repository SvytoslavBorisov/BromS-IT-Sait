// components/SectionDivider.tsx
"use client";

import React from "react";

/* ===== Константы вне рендера ===== */
const STYLE_CSS = `
  @keyframes waveShiftDesktop { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
  @keyframes waveShiftMobile  { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
  .wave-runner { animation: waveShiftMobile 18s linear infinite; will-change: transform; }
  @media (min-width: 768px) { .wave-runner { animation: waveShiftDesktop 14s linear infinite; } }
  @media (prefers-reduced-motion: reduce) { .wave-runner { animation: none; } }
`;
const PATH_MAIN = `
  M0,78 C240,140 420,20 720,78 C1020,130 1200,40 1440,92
  C1680,140 1860,20 2160,78 C2460,130 2640,40 2880,92
`;
const PATH_GLOW = `
  M0,92 C240,152 420,32 720,92 C1020,142 1200,58 1440,110
  C1680,152 1860,32 2160,92 C2460,142 2640,58 2880,110
`;

export default React.memo(function SectionDivider({
  flip = false,
  className = "",
}: { flip?: boolean; className?: string }) {
  const id = React.useId();
  const rootClass = `relative isolate h-16 md:h-24 -mt-6 pointer-events-none bg-white ${className}`;

  return (
    <div aria-hidden className={rootClass}>
      {/* «шторы» для мягких стыков */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 md:h-12 bg-gradient-to-b from-white to-transparent z-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 md:h-12 bg-gradient-to-t from-white to-transparent z-0" />

      <svg
        className={`absolute inset-0 h-full w-full ${flip ? "rotate-180" : ""}`}
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`${id}-shadow`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="black" stopOpacity="0.18" />
            <stop offset="1" stopColor="black" stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" />
          </filter>

          <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0.9" />
            <stop offset="1" stopColor="white" stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id={`${id}-glow`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0.35" />
            <stop offset="1" stopColor="white" stopOpacity="0.0" />
          </linearGradient>

          {/* Анимация — стабильная строка */}
          <style>{STYLE_CSS}</style>
        </defs>

        {/* Лента 2× ширины для бесшовного сдвига */}
        <g className="wave-runner" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <g>
            {/* Тень */}
            <path
              d={PATH_MAIN}
              fill="none"
              stroke={`url(#${id}-shadow)`}
              strokeWidth="26"
              strokeLinecap="round"
              filter={`url(#${id}-blur)`}
              style={{ mixBlendMode: "multiply" }}
            />
            {/* Основная линия */}
            <path d={PATH_MAIN} fill="none" stroke={`url(#${id}-gloss)`} strokeWidth="3" />
            {/* Еле заметное свечение */}
            <path d={PATH_GLOW} fill="none" stroke={`url(#${id}-glow)`} strokeWidth="12" />
          </g>
        </g>
      </svg>
    </div>
  );
});
