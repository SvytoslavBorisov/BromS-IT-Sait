"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import OrbitRings from "@/components/OrbitRings";

const EASE_IO = [0.4, 0, 0.2, 1] as const;

/** ===================== SVG BACKGROUND (легкий) ===================== **/
function AuroraSVG({
  tiltX,
  tiltY,
  reduced,
}: { tiltX: number; tiltY: number; reduced: boolean }) {
  const tx = `translate3d(${tiltX * 2}px, ${tiltY * 2}px, 0)`;
  const tx2 = `translate3d(${tiltX * -1.2}px, ${tiltY * -1.2}px, 0)`;
  const tx3 = `translate3d(${tiltX * 0.6}px, ${tiltY * 0.6}px, 0)`;

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

        {/* blur подешевле */}
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="12" edgeMode="duplicate" />
        </filter>
      </defs>

      {/* Лёгкие «пятна» без морфинга d */}
      <g style={{ transform: tx }}>
        <motion.path
          initial={{ opacity: 0.6 }}
          animate={reduced ? {} : { opacity: [0.55, 0.7, 0.55], scale: [1, 1.03, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: EASE_IO }}
          d="M 0 520 C 220 540 340 380 600 420 C 860 460 980 320 1200 340 L 1200 800 L 0 800 Z"
          fill="url(#g1)"
          filter="url(#softBlur)"
        />
      </g>

      <g style={{ transform: tx2 }}>
        <motion.path
          initial={{ opacity: 0.45 }}
          animate={reduced ? {} : { opacity: [0.4, 0.55, 0.4], scale: [1, 1.02, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: EASE_IO }}
          d="M 0 300 C 180 260 420 360 600 320 C 780 280 980 220 1200 260 L 1200 800 L 0 800 Z"
          fill="url(#g2)"
          filter="url(#softBlur)"
        />
      </g>

      <g style={{ transform: tx3 }}>
        <motion.circle
          cx="900"
          cy="680"
          r="280"
          fill="url(#g3)"
          filter="url(#softBlur)"
          initial={{ scale: 0.97, opacity: 0.6 }}
          animate={reduced ? {} : { scale: [0.97, 1.02, 0.97], opacity: [0.55, 0.65, 0.55] }}
          transition={{ duration: 14, repeat: Infinity, ease: EASE_IO }}
        />
      </g>

      {/* Статичная сетка (без анимации штрихов) — сильно дешевле */}
      <g stroke="rgba(0,0,0,0.05)" strokeWidth="1">
        {Array.from({ length: 10 }).map((_, i) => {
          const x = (i * 1200) / 9;
          return <path key={`v-${i}`} d={`M ${x} 0 L ${x} 800`} />;
        })}
        {Array.from({ length: 6 }).map((_, i) => {
          const y = (i * 800) / 5;
          return <path key={`h-${i}`} d={`M 0 ${y} L 1200 ${y}`} />;
        })}
      </g>
    </svg>
  );
}

/** ===================== MAIN HERO ===================== **/
export default function HeroSection() {
  const prefersReduced = useReducedMotion();

  // Параллакс по курсору — дешёвый transform-only
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tiltX = useSpring(mx, { stiffness: 80, damping: 15, mass: 0.3 });
  const tiltY = useSpring(my, { stiffness: 80, damping: 15, mass: 0.3 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mx.set((e.clientX / innerWidth - 0.5) * 10);
      my.set((e.clientY / innerHeight - 0.5) * -10);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  const chips = ["Next.js", "React", "Node.js", "Безопасность", "Интеграции"];

  return (
    <section
      id="top"
      aria-label="Hero"
      className="relative isolate min-h-[100svh] w-full overflow-hidden bg-white"
    >
      <OrbitRings />
      <AuroraSVG tiltX={tiltX.get() || 0} tiltY={tiltY.get() || 0} reduced={!!prefersReduced} />

      {/* Блики */}
      <div
        aria-hidden
        className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-white/30 blur-3xl -z-10"
        style={{ transform: `translate3d(${(tiltX.get() || 0) * 2}px, ${(tiltY.get() || 0) * 2}px, 0)` }}
      />
      <div
        aria-hidden
        className="absolute -right-40 top-1/3 h-[360px] w-[360px] rounded-full bg-neutral-100/60 blur-2xl -z-10"
        style={{ transform: `translate3d(${(tiltX.get() || 0) * -2}px, ${(tiltY.get() || 0) * -2}px, 0)` }}
      />

      {/* Контент */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl items-center justify-center px-4 md:px-8">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <div className="flex justify-center md:justify-end">
            <motion.div
              className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 rounded-3xl backdrop-blur-xl bg-white/60 ring-1 ring-black/5 shadow-[0_15px_60px_-15px_rgba(0,0,0,0.25)] will-change-transform"
              style={{ transformStyle: "preserve-3d", rotateX: tiltY, rotateY: tiltX }}
              whileHover={prefersReduced ? {} : { scale: 1.02 }}
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
            <motion.ul
              className="space-y-4 md:space-y-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.7 }}
            >
              <li className="text-3xl sm:text-4xl md:text-5xl font-light tracking-wide text-neutral-900">
                Чистый <span className="font-normal underline decoration-neutral-300">UI</span>
              </li>
              <li className="text-3xl sm:text-4xl md:text-5xl font-light tracking-wide text-neutral-900">
                Чистый код
              </li>
              <li className="text-3xl sm:text-4xl md:text-5xl font-light tracking-wide text-neutral-900">
                Чистое IT-решение
              </li>
            </motion.ul>

            <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
              {chips.map((t, i) => (
                <motion.span
                  key={t}
                  className="rounded-full px-3 py-1 text-xs md:text-sm text-neutral-700 bg-white/70 backdrop-blur-md ring-1 ring-black/10 shadow-sm"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  animate={prefersReduced ? {} : { y: [0, -2, 0] }}
                  transition={{ duration: 2, ease: EASE_IO, repeat: Infinity, delay: 0.2 * i }}
                  style={{ willChange: "transform" }}
                >
                  {t}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Стрелка (без state на scroll) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8 text-neutral-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          initial={false}
          animate={prefersReduced ? {} : { y: [0, 6, 0] }}
          transition={{ type: "tween", duration: 1.6, repeat: Infinity, ease: EASE_IO }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </div>
    </section>
  );
}
