// components/GlobalLightAbstractBg.tsx
import React from "react";

/**
 * ЛУННЫЙ светлый фон для всех белых секций.
 * Без styled-jsx, без framer-motion, без фильтров — максимально дружелюбно к Turbopack/SSR.
 * Состоит из двух мягких «аврор» (radialGradient) и едва заметной точечной сетки.
 */
export default function GlobalLightAbstractBg() {
  return (
    <svg
      aria-hidden
      className="fixed inset-0 -z-10 h-screen w-screen pointer-events-none"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Мягкие засветки */}
        <radialGradient id="glowA" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(260 140) rotate(0) scale(520 420)">
          <stop offset="0" stopColor="#c7d2fe" stopOpacity="0.9"/>
          <stop offset="1" stopColor="#ffffff" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="glowB" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(1180 720) rotate(0) scale(520 420)">
          <stop offset="0" stopColor="#a7f3d0" stopOpacity="0.85"/>
          <stop offset="1" stopColor="#ffffff" stopOpacity="0"/>
        </radialGradient>

        {/* Точечная сетка */}
        <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="rgba(0,0,0,0.9)" />
        </pattern>

        {/* Мягкая маска сверху/снизу чтобы фон не «резался» у краёв */}
        <linearGradient id="fadeY" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0" />
          <stop offset="0.12" stopColor="white" stopOpacity="1" />
          <stop offset="0.88" stopColor="white" stopOpacity="1" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Белая база */}
      <rect x="0" y="0" width="1440" height="900" fill="#ffffff" />

      {/* Аврора-пятна */}
      <rect x="0" y="0" width="1440" height="900" fill="url(#glowA)" />
      <rect x="0" y="0" width="1440" height="900" fill="url(#glowB)" />

      {/* Точечная сетка под маской (еле заметна) */}
      <g opacity="0.06" style={{ mixBlendMode: "multiply" }}>
        <rect x="0" y="0" width="1440" height="900" fill="url(#dots)" />
      </g>

      {/* Маска по вертикали — чтобы сетка/засветы плавно исчезали у верх/низ */}
      <rect x="0" y="0" width="1440" height="900" fill="url(#fadeY)" />
    </svg>
  );
}
