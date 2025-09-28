"use client";
import React from "react";

export default function Pitch({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 120 80"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      {/* фон газона (очень светлый) */}
      <rect x="0" y="0" width="120" height="80" fill="#f8fafc" />

      {/* разметка поля */}
      <g stroke="#cbd5e1" strokeWidth="0.6" fill="none">
        <rect x="1" y="1" width="118" height="78" rx="1.5" />
        <line x1="60" y1="1" x2="60" y2="79" />
        <circle cx="60" cy="40" r="9.15" />
        <circle cx="60" cy="40" r="0.8" fill="#cbd5e1" />

        {/* штрафные */}
        <rect x="1" y="18" width="18" height="44" />
        <rect x="101" y="18" width="18" height="44" />

        {/* воротные и вратарские */}
        <rect x="1" y="30" width="6" height="20" />
        <rect x="113" y="30" width="6" height="20" />

        {/* пенальти-точки */}
        <circle cx="12" cy="40" r="0.8" fill="#cbd5e1" />
        <circle cx="108" cy="40" r="0.8" fill="#cbd5e1" />

        {/* дуги штрафной */}
        <path d="M 19 40 m 0 -9 a 9 9 0 0 1 0 18" />
        <path d="M 101 40 m 0 -9 a 9 9 0 0 0 0 18" />
      </g>

      {/* Слот под стрелки/оверлеи */}
      {children}

      {/* рамка поверх */}
      <rect x="0" y="0" width="120" height="80" fill="none" stroke="#e2e8f0" strokeWidth="0.6" />
    </svg>
  );
}
