// components/SectionDividerBW.tsx
"use client";

import React from "react";

export default function SectionDividerBW({
  flip = false,
  className = "",
}: { flip?: boolean; className?: string }) {
  const id = React.useId();

  // «шторы» по краям: сверху — белый, снизу — чёрный (меняются местами при flip)
  const TopCurtain = () => (
    <div
      className={[
        "pointer-events-none absolute inset-x-0 top-0 h-10 md:h-12 z-0",
        flip ? "bg-gradient-to-b from-[#0a0a0a] to-transparent"
             : "bg-gradient-to-b from-white to-transparent",
      ].join(" ")}
    />
  );
  const BottomCurtain = () => (
    <div
      className={[
        "pointer-events-none absolute inset-x-0 bottom-0 h-10 md:h-12 z-0",
        flip ? "bg-gradient-to-t from-white to-transparent"
             : "bg-gradient-to-t from-[#0a0a0a] to-transparent",
      ].join(" ")}
    />
  );

  return (
    <div
      aria-hidden
      className={[
        "relative isolate h-20 md:h-28 -mt-6 pointer-events-none",
        // сам контейнер прозрачный — весь переход внутри SVG + «штор»
        className,
      ].join(" ")}
    >
      <TopCurtain />
      <BottomCurtain />

      <svg
        className={`absolute inset-0 h-full w-full ${flip ? "rotate-180" : ""}`}
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Заливка под волной: прозрачный → чёрный (для flip есть светлая версия) */}
          <linearGradient id={`${id}-fillToDark`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="rgba(0,0,0,0.3)" />
            <stop offset="65%" stopColor="rgba(0,0,0,0.8)" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          <linearGradient id={`${id}-fillToLight`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="white" />
            <stop offset="35%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          {/* Тень по линии волны (видна и на белом, и на чёрном) */}
          <linearGradient id={`${id}-shadow`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="black" stopOpacity="0.2" />
            <stop offset="1" stopColor="black" stopOpacity="0" />
          </linearGradient>
          <filter id={`${id}-blur`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="9" />
          </filter>

          {/* Тонкий «глянец» по гребню */}
          <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0.9" />
            <stop offset="1" stopColor="white" stopOpacity="0.35" />
          </linearGradient>

          {/* Анимация смещения по X (двойная ширина для бесшовности) */}
          <style>
            {`
              @keyframes waveShiftMobile { from { transform: translateX(0); } to { transform: translateX(-50%); } }
              @keyframes waveShiftDesktop { from { transform: translateX(0); } to { transform: translateX(-50%); } }

              .wave-runner {
                animation: waveShiftMobile 18s linear infinite;
                will-change: transform;
              }
              @media (min-width: 768px) {
                .wave-runner { animation: waveShiftDesktop 14s linear infinite; }
              }
              @media (prefers-reduced-motion: reduce) {
                .wave-runner { animation: none !important; }
              }
            `}
          </style>
        </defs>

        {/* Двухкратная лента: волна + заливка повторяются дважды для бесшовного скролла */}
        <g className="wave-runner" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          <g>
            {/* 1) Заливка ниже волны — именно она делает низ чёрным (или белым при flip) */}
            <path
              d="
                M0,78 C240,140 420,20 720,78 C1020,130 1200,40 1440,92
                L1440,160 L0,160 Z
                M1440,92
                C1680,140 1860,20 2160,78 C2460,130 2640,40 2880,92
                L2880,160 L1440,160 Z
              "
              fill={flip ? `url(#${id}-fillToLight)` : `url(#${id}-fillToDark)`}
            />

            {/* 2) Мягкая тень — контраст и объём */}
            <path
              d="
                M0,78 C240,140 420,20 720,78 C1020,130 1200,40 1440,92
                C1680,140 1860,20 2160,78 C2460,130 2640,40 2880,92
              "
              fill="none"
              stroke={`url(#${id}-shadow)`}
              strokeWidth="28"
              strokeLinecap="round"
              filter={`url(#${id}-blur)`}
              style={{ mixBlendMode: "multiply" }}
            />

            {/* 3) Тонкий «глянец» по гребню — читается на белом и чёрном */}
            <path
              d="
                M0,78 C240,140 420,20 720,78 C1020,130 1200,40 1440,92
                C1680,140 1860,20 2160,78 C2460,130 2640,40 2880,92
              "
              fill="none"
              stroke={`url(#${id}-gloss)`}
              strokeWidth="2"
            />
          </g>
        </g>
      </svg>
    </div>
  );
}
