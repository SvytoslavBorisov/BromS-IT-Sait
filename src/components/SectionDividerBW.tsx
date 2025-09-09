// components/SectionDividerBW.tsx
"use client";

import React, { useMemo } from "react";

/* ===== Анимации и медиа ===== */
const STYLE_CSS = `
  @keyframes waveShiftMobile { from { transform: translate3d(0,0,0) } to { transform: translate3d(-50%,0,0) } }
  @keyframes waveShiftDesktop { from { transform: translate3d(0,0,0) } to { transform: translate3d(-50%,0,0) } }
  .wave-runner { animation: waveShiftMobile 18s linear infinite; will-change: transform; }
  @media (min-width: 768px) { .wave-runner { animation: waveShiftDesktop 14s linear infinite; } }
  @media (prefers-reduced-motion: reduce) { .wave-runner { animation: none !important; } }
`;

const PATH_MAIN = `
  M0,78 C240,140 420,20 720,78 C1020,130 1200,40 1440,92
  C1680,140 1860,20 2160,78 C2460,130 2640,40 2880,92
`;
const PATH_FILL = `
  M0,78 C240,140 420,20 720,78 C1020,130 1200,40 1440,92
  L1440,160 L0,160 Z
  M1440,92
  C1680,140 1860,20 2160,78 C2460,130 2640,40 2880,92
  L2880,160 L1440,160 Z
`;

export default React.memo(function SectionDividerBW({
  flip = false,
  className = "",
}: { flip?: boolean; className?: string }) {
  const id = React.useId();

  const topCurtainClass = useMemo(
    () =>
      `pointer-events-none absolute inset-x-0 top-0 h-10 md:h-12 z-0 ${
        flip ? "bg-gradient-to-b from-[#0a0a0a] to-transparent" : "bg-gradient-to-b from-white to-transparent"
      }`,
    [flip]
  );
  const bottomCurtainClass = useMemo(
    () =>
      `pointer-events-none absolute inset-x-0 bottom-0 h-10 md:h-12 z-0 ${
        flip ? "bg-gradient-to-t from-white to-transparent" : "bg-gradient-to-t from-[#0a0a0a] to-transparent"
      }`,
    [flip]
  );

  const rootClass = `relative isolate h-20 md:h-28 -mt-6 pointer-events-none ${className}`;

  return (
    <div aria-hidden className={rootClass} style={{ contain: "paint" }}>
      <div className={topCurtainClass} />
      <div className={bottomCurtainClass} />

      <svg
        className={`absolute inset-0 h-full w-full ${flip ? "rotate-180" : ""}`}
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <linearGradient id={`${id}-fillToDark`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,0,0,0.3)" />
            <stop offset="65%" stopColor="rgba(0,0,0,0.8)" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          <linearGradient id={`${id}-fillToLight`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" />
            <stop offset="35%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          <linearGradient id={`${id}-shadow`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="black" stopOpacity="0.2" />
            <stop offset="1" stopColor="black" stopOpacity="0" />
          </linearGradient>
          {/* Ограничили область blur — быстрее на мобильных */}
          <filter id={`${id}-blur`} x="-15%" y="-50%" width="130%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>

          <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0.9" />
            <stop offset="1" stopColor="white" stopOpacity="0.35" />
          </linearGradient>

          <style>{STYLE_CSS}</style>
        </defs>

        {/* Лента 2× ширины для бесшовного сдвига */}
        <g className="wave-runner" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <g>
            {/* 1) Заливка ниже волны */}
            <path d={PATH_FILL} fill={flip ? `url(#${id}-fillToLight)` : `url(#${id}-fillToDark)`} />

            {/* 2) Мягкая тень */}
            <path
              d={PATH_MAIN}
              fill="none"
              stroke={`url(#${id}-shadow)`}
              strokeWidth="28"
              strokeLinecap="round"
              filter={`url(#${id}-blur)`}
              style={{ mixBlendMode: "multiply" }}
            />

            {/* 3) Тонкий «глянец» */}
            <path d={PATH_MAIN} fill="none" stroke={`url(#${id}-gloss)`} strokeWidth="2" />
          </g>
        </g>
      </svg>
    </div>
  );
});
