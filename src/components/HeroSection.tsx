// src/components/HeroSection.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";

const EASE_IO = [0.4, 0, 0.2, 1] as const;

/** --- Статичный лёгкий фон: используется на SSR и на первом клиентском кадре --- */
function StaticGridBg() {
  return (
    <svg
      className="absolute inset-0 -z-20 h-full w-full pointer-events-none [mask-image:radial-gradient(1200px_800px_at_50%_30%,white,transparent_80%)]"
      viewBox="0 0 1200 800"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f5f5f5" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1200" height="800" fill="url(#lg)" />
      <g stroke="rgba(0,0,0,0.05)" strokeWidth="1">
        {Array.from({ length: 10 }, (_, i) => (i * 1200) / 9).map((x) => <path key={`v-${x}`} d={`M ${x} 0 L ${x} 800`} />)}
        {Array.from({ length: 6 }, (_, i) => (i * 800) / 5).map((y) => <path key={`h-${y}`} d={`M 0 ${y} L 1200 ${y}`} />)}
      </g>
    </svg>
  );
}

/** --- Аврора: включается только после маунта при heavyOK --- */
function AuroraSVG({
  x, y, reduced,
}: {
  x: ReturnType<typeof useSpring>;
  y: ReturnType<typeof useSpring>;
  reduced: boolean;
}) {
  const g1x = useTransform(x, (v) => v * 2);
  const g1y = useTransform(y, (v) => v * 2);
  const g2x = useTransform(x, (v) => v * -1.2);
  const g2y = useTransform(y, (v) => v * -1.2);
  const g3x = useTransform(x, (v) => v * 0.6);
  const g3y = useTransform(y, (v) => v * 0.6);

  const grid = useMemo(() => {
    const vs = Array.from({ length: 10 }, (_, i) => (i * 1200) / 9);
    const hs = Array.from({ length: 6 }, (_, i) => (i * 800) / 5);
    return { vs, hs };
  }, []);

  return (
    <svg
      className="absolute inset-0 -z-20 h-full w-full pointer-events-none [mask-image:radial-gradient(1200px_800px_at_50%_30%,white,transparent_80%)]"
      viewBox="0 0 1200 800"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id="g1" cx="20%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#a7f3d0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="g2" cx="80%" cy="10%" r="80%">
          <stop offset="0%" stopColor="#f5d0fe" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#c7d2fe" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="g3" cx="50%" cy="90%" r="80%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#fecaca" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="softBlur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="10" edgeMode="duplicate" />
        </filter>
        {!reduced && (
          <style>{`
            .aurora { transform-origin: 50% 50%; will-change: transform, opacity; }
            .a1 { animation: pulse1 16s ease-in-out infinite; }
            .a2 { animation: pulse2 18s ease-in-out infinite; }
            .a3 { animation: pulse3 14s ease-in-out infinite; }
            @keyframes pulse1 { 0%{opacity:.55; transform:scale(1)} 50%{opacity:.7; transform:scale(1.03)} 100%{opacity:.55; transform:scale(1)} }
            @keyframes pulse2 { 0%{opacity:.4;  transform:scale(1)} 50%{opacity:.55; transform:scale(1.02)} 100%{opacity:.4;  transform:scale(1)} }
            @keyframes pulse3 { 0%{opacity:.55; transform:scale(.97)} 50%{opacity:.65; transform:scale(1.02)} 100%{opacity:.55; transform:scale(.97)} }
          `}</style>
        )}
      </defs>

      <motion.g style={{ x: g1x, y: g1y }}>
        <path d="M 0 520 C 220 540 340 380 600 420 C 860 460 980 320 1200 340 L 1200 800 L 0 800 Z"
              fill="url(#g1)" filter="url(#softBlur)" className="aurora a1" />
      </motion.g>
      <motion.g style={{ x: g2x, y: g2y }}>
        <path d="M 0 300 C 180 260 420 360 600 320 C 780 280 980 220 1200 260 L 1200 800 L 0 800 Z"
              fill="url(#g2)" filter="url(#softBlur)" className="aurora a2" />
      </motion.g>
      <motion.g style={{ x: g3x, y: g3y }}>
        <circle cx="900" cy="680" r="280" fill="url(#g3)" filter="url(#softBlur)" className="aurora a3" />
      </motion.g>

      <g stroke="rgba(0,0,0,0.05)" strokeWidth="1">
        {grid.vs.map((x) => <path key={`v-${x}`} d={`M ${x} 0 L ${x} 800`} />)}
        {grid.hs.map((y) => <path key={`h-${y}`} d={`M 0 ${y} L 1200 ${y}`} />)}
      </g>
    </svg>
  );
}

/** --- Флаг производительности: heavyOK по умолчанию false до маунта (важно для гидрации) --- */
function useHeavyOK() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [small, setSmall] = useState(false);
  const [lowPerf, setLowPerf] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    const mqSmall  = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setCoarse(mqCoarse.matches);
      setSmall(mqSmall.matches);
      const dm = (navigator as any).deviceMemory ?? 8;
      const hc = navigator.hardwareConcurrency ?? 8;
      setLowPerf(dm <= 4 || hc <= 4);
    };
    update();
    mqCoarse.addEventListener("change", update);
    mqSmall.addEventListener("change", update);
    return () => {
      mqCoarse.removeEventListener("change", update);
      mqSmall.removeEventListener("change", update);
    };
  }, []);

  // На SSR и на первом клиентском кадре heavyOK === false → одинаковый HTML
  const heavyOK = mounted && !coarse && !small && !prefersReduced && !lowPerf;
  return { prefersReduced, heavyOK };
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { prefersReduced, heavyOK } = useHeavyOK();

  // Значения для авроры/бликов — без слушателей, пока !heavyOK
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tiltX = useSpring(mx, { stiffness: 80, damping: 15, mass: 0.3 });
  const tiltY = useSpring(my, { stiffness: 80, damping: 15, mass: 0.3 });

  // Параллакс мышью — подключаем только при heavyOK
  useEffect(() => {
    if (!heavyOK || prefersReduced) return;
    if (typeof window === "undefined") return;
    const supportsFine = window.matchMedia?.("(pointer: fine)")?.matches;
    if (!supportsFine) return;

    const el = sectionRef.current ?? document.body;
    let raf = 0, lastX = 0, lastY = 0;

    const onMove = (e: PointerEvent) => {
      const rect = sectionRef.current?.getBoundingClientRect();
      const w = rect?.width ?? window.innerWidth;
      const h = rect?.height ?? window.innerHeight;
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      lastX = ((e.clientX - left) / w - 0.5) * 10;
      lastY = ((e.clientY - top) / h - 0.5) * -10;
      if (!raf) {
        raf = requestAnimationFrame(() => { mx.set(lastX); my.set(lastY); raf = 0; });
      }
    };
    const onLeave = () => {
      if (!raf) raf = requestAnimationFrame(() => { mx.set(0); my.set(0); raf = 0; });
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove as any);
      el.removeEventListener("pointerleave", onLeave as any);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mx, my, heavyOK, prefersReduced]);

  const glare1X = useTransform(tiltX, (v) => v * 2);
  const glare1Y = useTransform(tiltY, (v) => v * 2);
  const glare2X = useTransform(tiltX, (v) => v * -2);
  const glare2Y = useTransform(tiltY, (v) => v * -2);

  const chips = useMemo(() => ["Next.js", "React", "Node.js", "Безопасность", "Интеграции"], []);

  return (
    <section
      ref={sectionRef}
      id="top"
      aria-label="Hero"
      className="relative isolate min-h-[100svh] w-full overflow-hidden bg-white"
      style={{ contain: "layout paint" }}
    >

      {/* 2) Фон: на SSR/первом кадре ВСЕГДА StaticGridBg; после маунта переключаемся на Aurora при heavyOK */}
      {heavyOK ? (
        <AuroraSVG x={tiltX} y={tiltY} reduced={!!prefersReduced} />
      ) : (
        <StaticGridBg />
      )}

      {/* 3) Блики — только при heavyOK */}
      {heavyOK && !prefersReduced && (
        <>
          <motion.div
            aria-hidden
            className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-white/30 blur-3xl -z-10 will-change-transform"
            style={{ x: glare1X, y: glare1Y, translateZ: 0 }}
          />
          <motion.div
            aria-hidden
            className="absolute -right-40 top-1/3 h-[360px] w-[360px] rounded-full bg-neutral-100/60 blur-2xl -z-10 will-change-transform"
            style={{ x: glare2X, y: glare2Y, translateZ: 0 }}
          />
        </>
      )}

      {/* 4) Контент — без анимаций на мобилке, с лёгкими — на десктопе (через heavyOK) */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl items-center justify-center px-4 md:px-8">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="flex justify-center md:justify-end">
            <motion.div
              className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-3xl backdrop-blur-xl bg-white/60 ring-1 ring-black/5 shadow-[0_15px_60px_-15px_rgba(0,0,0,0.25)] will-change-transform"
              style={heavyOK ? { transformStyle: "preserve-3d", rotateX: tiltY, rotateY: tiltX } : undefined}
              whileHover={heavyOK && !prefersReduced ? { scale: 1.02 } : {}}
              transition={{ type: "spring", stiffness: 120, damping: 12 }}
            >
              <Image
                src="/logo.png"
                alt="БромС"
                fill
                className="object-contain p-6"
                sizes="(max-width:768px) 60vw, 30vw"
                priority
              />
              <span className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/50 to-transparent" />
            </motion.div>
          </div>

          <div className="text-center md:text-left">
            <div className="select-none">
              <h1 className="font-display font-[350] tracking-[-0.01em] leading-[1.05] text-[clamp(28px,4.6vw,56px)] text-neutral-900">
                Чистый <span className="inline-block -mx-1 px-2 py-0.5 rounded-xl bg-white/70 backdrop-blur-md ring-1 ring-black/5 align-baseline">UI</span>
              </h1>
              <h2 className="mt-2 font-display font-[350] tracking-[-0.01em] leading-[1.05] text-[clamp(28px,4.6vw,56px)] text-neutral-900">
                Чистый <span className="font-mono font-medium bg-gradient-to-r from-neutral-900 to-neutral-600 bg-clip-text text-transparent underline decoration-neutral-300/80 underline-offset-[6px]">код</span>
              </h2>
              <h3 className="mt-2 font-display font-[350] tracking-[-0.01em] leading-[1.05] text-[clamp(28px,4.6vw,56px)] text-neutral-900">
                Чистое IT-решение
              </h3>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
              {chips.map((t, i) => (
                <span
                  key={t}
                  className="rounded-full px-3 py-1 text-xs md:text-sm text-neutral-700 bg-white/70 backdrop-blur-md ring-1 ring-black/10 shadow-sm"
                  style={heavyOK && !prefersReduced ? { animation: `chip-bob 2s cubic-bezier(0.4,0,0.2,1) ${0.2 * i}s infinite`, willChange: "transform" } : undefined}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>


      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden
              style={{ animation: "arrow-bounce 1.6s cubic-bezier(0.4,0,0.2,1) infinite" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>


      {/* Кейфреймы подключаем только если реально нужны */}
      {heavyOK && !prefersReduced && (
        <style>{`
          @keyframes chip-bob { 0%{transform:translateY(0)} 50%{transform:translateY(-2px)} 100%{transform:translateY(0)} }
          @keyframes arrow-bounce { 0%{transform:translateY(0)} 50%{transform:translateY(6px)} 100%{transform:translateY(0)} }
        `}</style>
      )}
    </section>
  );
}
