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
function GlobalCryptoBg({ reduced = false }: { reduced?: boolean }) {
  // плавная морфинг-волна (аврора)
  const d1 = "M0,520 C220,560 380,460 640,500 C900,540 1080,440 1440,470 L1440,900 L0,900 Z";
  const d2 = "M0,520 C260,460 420,620 640,580 C860,540 1120,500 1440,520 L1440,900 L0,900 Z";

  return (
 <svg
   className="pointer-events-none fixed inset-0 z-0 h-[100vh] w-[100vw]"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        {/* Чёрный кинофон (через градиент) */}
        <linearGradient id="bg-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f0f0f" />
          <stop offset="60%" stopColor="#000000" />
        </linearGradient>

        {/* Маска-завеса (кросс-браузерно, в т.ч. Safari) */}
        <radialGradient id="fadeG" cx="50%" cy="12%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="84%" stopColor="#000000" />
        </radialGradient>
        <mask id="fadeMask" maskUnits="userSpaceOnUse">
          <rect width="1440" height="900" fill="url(#fadeG)" />
        </mask>

        {/* Аврора — монохромные блики без синевы */}
        <radialGradient id="g-aurora-1" cx="18%" cy="10%" r="80%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="100%" stopColor="rgba(11,11,11,0)" />
        </radialGradient>
        <radialGradient id="g-aurora-2" cx="86%" cy="14%" r="80%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(11,11,11,0)" />
        </radialGradient>

        {/* Гекс-сетка (аккуратная, неяркая) */}
        <pattern id="hex" width="28" height="24.248" patternUnits="userSpaceOnUse">
          <path
            d="M14 0 L28 8.082 L28 16.165 L14 24.248 L0 16.165 L0 8.082 Z"
            fill="none"
            stroke="rgba(255,255,255,0.065)"
            strokeWidth="1"
            shapeRendering="crispEdges"
          />
        </pattern>

        {/* Скан-линии (тонкая неоновая полоса) */}
        <linearGradient id="scan" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Фильтры */}
        <filter id="blur28">
          <feGaussianBlur stdDeviation="28" edgeMode="duplicate" />
        </filter>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.03" />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* Базовый фон */}
      <rect x="0" y="0" width="1440" height="900" fill="url(#bg-grad)" />

      {/* Все декоративные слои под общей маской (не «давят» по краям) */}
      <g mask="url(#fadeMask)">
        {/* Аврора / волны */}
        <motion.path
          d={d1}
          fill="url(#g-aurora-1)"
          filter="url(#blur28)"
          opacity="0.85"
          initial={false}
          animate={reduced ? undefined : { d: [d1, d2, d1] }}
          transition={{ type: "tween", duration: 18, repeat: Infinity, ease: EASE_IO }}
        />
        <motion.path
          d={d2}
          fill="url(#g-aurora-2)"
          filter="url(#blur28)"
          opacity="0.6"
          initial={false}
          animate={reduced ? undefined : { d: [d2, d1, d2] }}
          transition={{ type: "tween", duration: 22, repeat: Infinity, ease: EASE_IO }}
        />

        {/* Гекс-сетка */}
        <rect x="0" y="0" width="1440" height="900" fill="url(#hex)" />

        {/* Едва заметные «орбитальные дуги» */}
        <motion.g
          initial={false}
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 90, ease: "linear", repeat: Infinity }}
          style={{ transformOrigin: "720px 450px" }}
          opacity="0.25"
        >
          <circle cx="720" cy="450" r="260" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" strokeDasharray="160 900" />
          <circle cx="720" cy="450" r="360" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" strokeDasharray="140 900" />
        </motion.g>

        {/* Горизонтальные скан-линии */}
        {[140, 280, 420, 560, 700].map((y, i) => (
          <motion.line
            key={y}
            x1="-10"
            x2="1450"
            y1={y}
            y2={y}
            stroke="url(#scan)"
            strokeWidth="2"
            initial={{ opacity: 0 }}
            animate={reduced ? undefined : { opacity: [0, 1, 0] }}
            transition={{ type: "tween", duration: 3 + i * 0.25, repeat: Infinity, ease: EASE_IO, delay: i * 0.5 }}
          />
        ))}

        {/* Плёночное зерно */}
        <rect x="0" y="0" width="1440" height="900" filter="url(#grain)" />
      </g>
    </svg>
  );
}

export default function CryptoLandingClient() {
  const reduced = useReducedMotion();

  return (
    <div className="relative isolate min-h-screen bg-black text-white">
      {/* Глобальный фон (фиксированный, всегда позади) */}
      <GlobalCryptoBg reduced={!!reduced} />

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
