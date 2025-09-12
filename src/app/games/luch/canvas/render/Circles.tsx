"use client";

import React, { useMemo } from "react";
import { CircleObj } from "../../engine/types";

export function Circles({
  circlesPx,
  maskToHex,
  onFilterPick,
}: {
  circlesPx: CircleObj[];
  maskToHex: (mask: number) => string;
  onFilterPick: (id: string) => void;
}) {
  const goalPx = circlesPx.find((c) => c.kind === "goal");

  // Уникальные id для локальных <defs>, чтобы не конфликтовать
  const ids = useMemo(() => {
    const base = `cx-${Math.random().toString(36).slice(2, 8)}`;
    return {
      filtSoft: `${base}-soft`,
      filtHalo: `${base}-halo`,
      filtEdge: `${base}-edge`,
      gradGlass: `${base}-glass`,
      gradGoal: `${base}-goal`,
      gradScan: `${base}-scan`,
      patTicks: `${base}-ticks`,
      patSpark: `${base}-spark`,
    };
  }, []);

  return (
    <>
      {/* ---------- Локальные defs ---------- */}
      <defs>
        {/* Общее мягкое свечение (для фильтров/обманок) */}
        <filter id={ids.filtSoft} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="4" />
        </filter>

        {/* Широкий ореол (для цели) */}
        <filter id={ids.filtHalo} x="-220%" y="-220%" width="560%" height="560%">
          <feGaussianBlur stdDeviation="14" result="b1" />
          <feGaussianBlur stdDeviation="26" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
          </feMerge>
        </filter>

        {/* Тонкая подсветка кромки */}
        <filter id={ids.filtEdge} x="-120%" y="-120%" width="320%" height="320%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>

        {/* «Стеклянный» градиент для фильтров/обманок */}
        <radialGradient id={ids.gradGlass} cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
        </radialGradient>

        {/* Градиент цели (по окружности) */}
        <linearGradient id={ids.gradGoal} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="50%"  stopColor="#e8f5ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
        </linearGradient>

        {/* Сканирующая дуга по кольцу цели */}
        <linearGradient id={ids.gradScan} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
          <stop offset="50%"  stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Риски/деления для цели */}
        <pattern id={ids.patTicks} patternUnits="userSpaceOnUse" width="6" height="6">
          <rect x="0" y="0" width="6" height="6" fill="none" />
          <rect x="2.8" y="0" width="0.4" height="6" fill="rgba(255,255,255,0.38)" />
        </pattern>

        {/* Искорки (микро-спарк) */}
        <pattern id={ids.patSpark} patternUnits="userSpaceOnUse" width="8" height="8">
          <circle cx="2" cy="2" r="0.6" fill="rgba(255,255,255,0.24)" />
          <circle cx="6" cy="5" r="0.5" fill="rgba(255,255,255,0.14)" />
        </pattern>
      </defs>

      {/* ---------- Фильтры и обманки ---------- */}
      {circlesPx
        .filter((c) => c.kind !== "goal")
        .map((c) => {
          const col = c.kind === "filter" ? maskToHex(c.mask ?? 0) : "#59ff7a";
          const op = c.kind === "filter" ? 0.28 : 0.18;
          const canDrag = c.kind === "filter";
          const inner = c.r * 0.38;

          return (
            <g
              key={c.id}
              onPointerDown={(e) => {
                e.preventDefault();
                if (canDrag) onFilterPick(c.id);
              }}
              style={{ cursor: canDrag ? "grab" : "default" }}
            >
              {/* Широкая мягкая подложка */}
              <g filter={`url(#${ids.filtSoft})`} opacity={0.85}>
                <circle cx={c.C.x} cy={c.C.y} r={c.r} fill={col} opacity={op * 0.6} />
              </g>

              {/* Основной круг */}
              <circle
                cx={c.C.x} cy={c.C.y} r={c.r}
                fill={col} opacity={op} stroke={col} strokeWidth={2}
              />

              {/* Стеклянный слой сверху */}
              <circle cx={c.C.x} cy={c.C.y} r={c.r} fill={`url(#${ids.gradGlass})`} />

              {/* Центральное свечение */}
              <circle cx={c.C.x} cy={c.C.y} r={inner} fill={col} opacity={0.22} />

              {/* Едва заметные искорки */}
              <circle cx={c.C.x} cy={c.C.y} r={c.r} fill={`url(#${ids.patSpark})`} opacity={0.25} />
            </g>
          );
        })}

      {/* ---------- ЦЕЛЬ (маяк/портал) ---------- */}
      {goalPx && (() => {
        const reqColor = maskToHex(goalPx.requiredMask ?? 0);
        const R = goalPx.r;
        const cx = goalPx.C.x;
        const cy = goalPx.C.y;

        return (
          <g>
            {/* Дальний ореол (станет очень ярким при попадании луча) */}
            <g filter={`url(#${ids.filtHalo})`}>
              <circle cx={cx} cy={cy} r={R * 1.25} fill={reqColor} opacity={0.14} />
            </g>

            {/* Внешнее кольцо цели */}
            <circle
              cx={cx} cy={cy} r={R}
              fill="none" stroke={`url(#${ids.gradGoal})`}
              strokeWidth={6}
            />

            {/* Тонкая кромка с рисками (вращается) */}
            <g opacity={0.8}>
              <circle
                cx={cx} cy={cy} r={R + 1.5}
                fill="none" stroke={`url(#${ids.patTicks})`}
                strokeWidth={2}
                strokeLinecap="round"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
                  dur="8s" repeatCount="indefinite"
                />
              </circle>
            </g>

            {/* Сканирующая дуга по орбите */}
            <g opacity={0.9} filter={`url(#${ids.filtEdge})`}>
              <path
                d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`}
                stroke={`url(#${ids.gradScan})`}
                strokeWidth={4} fill="none" strokeLinecap="round"
              >
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`}
                  dur="2.6s" repeatCount="indefinite"
                />
              </path>
            </g>

            {/* Внутреннее свечение/ядро */}
            <circle cx={cx} cy={cy} r={R * 0.28} fill={reqColor} opacity={0.18} />

            {/* Пульсирующие концентрические волны (делают «уровень пройден» ЗАМЕТНЫМ при попадании луча) */}
            {[0, 0.5].map((phase) => (
              <circle
                key={`pulse-${phase}`}
                cx={cx} cy={cy} r={R * 0.5}
                stroke={reqColor} strokeWidth={2} fill="none" opacity={0.35}
              >
                <animate
                  attributeName="r"
                  values={`${R*0.5}; ${R*1.6}; ${R*0.5}`}
                  dur="2.2s" begin={`${phase}s`} repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.5; 0.0; 0.5"
                  dur="2.2s" begin={`${phase}s`} repeatCount="indefinite"
                />
              </circle>
            ))}

            {/* Надпись GOAL — мягко вспыхивает (будет СУПЕР заметна вместе со вспышками луча) */}
            <g>
              <text
                x={cx} y={cy + 5} textAnchor="middle"
                fontSize={12} fill={reqColor}
                style={{ fontWeight: 900, letterSpacing: 1.2 }}
              >
                GOAL
                <animate
                  attributeName="opacity"
                  values="0.55; 1; 0.55"
                  dur="1.6s" repeatCount="indefinite"
                />
              </text>
            </g>
          </g>
        );
      })()}
    </>
  );
}
