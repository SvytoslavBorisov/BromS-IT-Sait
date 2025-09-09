// components/GlobalLightAbstractBg.tsx
import React from "react";

/**
 * Лёгкий фон для белых секций:
 *   - две мягкие засветки (radial-gradient)
 *   - еле заметная точечная сетка (repeating-radial-gradient)
 *   - плавная вертикальная «штора» через mask-image
 * Без SVG/фильтров/pattern — минимальные репейнты, хорошо кэшируется GPU.
 */
export default function GlobalLightAbstractBg() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-screen w-screen"
      style={{
        // базовый белый
        backgroundColor: "#fff",

        // две засветки
        backgroundImage: [
          "radial-gradient(520px 420px at 260px 140px, rgba(199,210,254,0.9) 0%, rgba(255,255,255,0) 100%)",
          "radial-gradient(520px 420px at calc(100% - 260px) calc(100% - 180px), rgba(167,243,208,0.85) 0%, rgba(255,255,255,0) 100%)",

          // еле заметная сетка — без SVG pattern
          "repeating-radial-gradient(circle at 1px 1px, rgba(0,0,0,0.9) 0 1px, transparent 1px 22px)",
        ].join(","),
        backgroundBlendMode: "normal, normal, multiply",
        opacity: 1,

        // мягкое исчезновение сверху/снизу — через маску (дорого не стоит)
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)",
      }}
    />
  );
}
