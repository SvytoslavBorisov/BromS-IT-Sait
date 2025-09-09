// components/OrbitRings.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Dot = { leftPct: number; topPct: number; delay: number; dur: number };

function useReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

// Простой детерминированный PRNG, чтобы избежать гидрационных рассинхронов:
// генерируем точки ТОЛЬКО после монтирования (на клиенте).
function makeDots(n: number): Dot[] {
  const arr: Dot[] = [];
  for (let i = 0; i < n; i++) {
    const left = Math.random() * 100; // %
    const top = Math.random() * 100;  // %
    arr.push({
      leftPct: left,
      topPct: top,
      delay: i * 0.12,
      dur: 10 + (i % 5),
    });
  }
  return arr;
}

export default function OrbitRings() {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [dots, setDots] = useState<Dot[]>([]);

  useEffect(() => {
    setMounted(true);
    const count = reduced ? 12 : 28; // меньше точек при reduced-motion
    setDots(makeDots(count));
  }, [reduced]);

  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10"
      style={{ contain: "paint" }}
      aria-hidden
    >
      {/* Внешнее и внутреннее кольцо — только CSS-анимации */}
      <div className="absolute inset-0 rounded-full border border-black/5 animate-[spin_60s_linear_infinite]" />
      <div className="absolute inset-12 rounded-full border border-black/5 animate-[spin_90s_linear_infinite_reverse]" />

      {/* Микрочастицы — без JS-анимаций на кадр */}
      <div className={`absolute inset-0 overflow-hidden ${reduced ? "reduced" : ""}`}>
        {mounted &&
          dots.map((d, i) => (
            <span
              key={i}
              className="absolute h-[2px] w-[2px] rounded-full bg-black/10 dot"
              style={{
                left: `${d.leftPct}%`,
                top: `${d.topPct}%`,
                animationDelay: `${d.delay}s`,
                animationDuration: `${d.dur}s`,
              }}
            />
          ))}
      </div>

      <style>{`
        .dot {
          opacity: .25;
          will-change: transform, opacity;
          animation-name: dotFloat;
          animation-timing-function: cubic-bezier(.4,0,.2,1);
          animation-iteration-count: infinite;
        }
        @keyframes dotFloat {
          0%   { transform: translate3d(0,0,0);   opacity: .25; }
          50%  { transform: translate3d(0,-8%,0); opacity: .65; }
          100% { transform: translate3d(0,0,0);   opacity: .25; }
        }
        .reduced .dot { animation: none !important; }
        @media (prefers-reduced-motion: reduce) {
          .dot { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
