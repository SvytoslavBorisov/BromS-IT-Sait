// app/CryptoLandingClient.tsx
"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";

import Hero from "./sections/Hero";
import Features from "./sections/Features";
import Articles from "./sections/Articles";
import Tools from "./sections/Tools";
import Games from "./sections/Games";
import CTA from "./sections/CTA";
import Footer from "./sections/Footer";

/** cubic-bezier */
const EASE_IO = [0.4, 0.0, 0.2, 1] as const;

/* ========= Глобальный фон (фиксированный на ВСЮ страницу) ========= */
function GlobalCryptoBg() {
  return (
    <svg
      className="pointer-events-none fixed inset-0 z-0 h-[100vh] w-[100vw] z-10"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        {/* Базовый «кино»-градиент */}
        <linearGradient id="bg-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f0f0f" />
          <stop offset="60%" stopColor="#000000" />
        </linearGradient>

        {/* Маска-полушар (чёткий «свет сверху») – ровно то, что тебе зашло */}
        <radialGradient id="fadeG" cx="50%" cy="12%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="84%" stopColor="#000000" />
        </radialGradient>
        <mask id="fadeMask">
          <rect width="1440" height="900" fill="url(#fadeG)" />
        </mask>

        {/* Мягкие «авроры» без blur-фильтров (лёгкие для GPU) */}
        {/* Ненавязчивая гекс-сетка (статичная) */}
        <pattern id="hex" width="28" height="24.248" patternUnits="userSpaceOnUse">
          <path
            d="M14 0 L28 8.082 L28 16.165 L14 24.248 L0 16.165 L0 8.082 Z"
            fill="none"
            stroke="rgba(255,255,255,0.065)"
            strokeWidth="1"
            shapeRendering="crispEdges"
          />
        </pattern>

        {/* Тонкие орбитальные дуги (статично) */}
        <linearGradient id="orbitStroke" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.0)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="80%" stopColor="rgba(255,255,255,0.0)" />
        </linearGradient>
      </defs>

      {/* База */}
      <rect x="0" y="0" width="1440" height="900" fill="url(#bg-grad)" />

      {/* Все слои под маской-полушаром */}
      <g mask="url(#fadeMask)">
        {/* Авроры (без blur-фильтра) */}
        <path
          d="M0,520 C220,560 380,460 640,500 C900,540 1080,440 1440,470 L1440,900 L0,900 Z"
          fill="url(#g-aurora-1)"
          opacity="0.85"
        />
        <path
          d="M0,520 C260,460 420,620 640,580 C860,540 1120,500 1440,520 L1440,900 L0,900 Z"
          fill="url(#g-aurora-2)"
          opacity="0.6"
        />

        {/* Гекс-сетка */}
        <rect x="0" y="0" width="1440" height="900" fill="url(#hex)" />

        {/* Лёгкие орбитальные дуги (статично) */}
        <g opacity="0.25">
          <circle cx="720" cy="450" r="260" fill="none" stroke="url(#orbitStroke)" strokeWidth="0.6" strokeDasharray="160 900" />
          <circle cx="720" cy="450" r="360" fill="none" stroke="url(#orbitStroke)" strokeWidth="0.6" strokeDasharray="140 900" />
        </g>
      </g>
    </svg>
  );
}

export default function CryptoLandingClient() {
  const reduced = useReducedMotion();

  return (
    <div className="relative isolate min-h-screen bg-black text-white">
      {/* Глобальный фон (фиксированный, всегда позади) */}
      <GlobalCryptoBg />

      {/* Контентные секции поверх */}
      <Hero />
      <Features />
      <Articles />
      <Tools />
      <Games />
      <CTA />
      <Footer />
    </div>
  );
}
