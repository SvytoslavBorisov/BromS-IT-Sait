"use client";

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import CarouselClient from "@/app/CarouselClient";
import OrbitRings from "@/components/OrbitRings";

const EASE_IO = [0.4, 0.0, 0.2, 1] as const;

function ProjectsBackground({
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
        <radialGradient id="pg1" cx="20%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#a7f3d0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pg2" cx="80%" cy="10%" r="80%">
          <stop offset="0%" stopColor="#f5d0fe" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#c7d2fe" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pg3" cx="50%" cy="90%" r="80%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#fecaca" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="pblur">
          <feGaussianBlur stdDeviation="12" edgeMode="duplicate" />
        </filter>
      </defs>

      <g style={{ transform: tx }}>
        <motion.path
          initial={{ opacity: 0.6 }}
          animate={reduced ? {} : { opacity: [0.55, 0.7, 0.55], scale: [1, 1.03, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: EASE_IO }}
          d="M 0 520 C 220 540 340 380 600 420 C 860 460 980 320 1200 340 L 1200 800 L 0 800 Z"
          fill="url(#pg1)"
          filter="url(#pblur)"
        />
      </g>

      <g style={{ transform: tx2 }}>
        <motion.path
          initial={{ opacity: 0.5 }}
          animate={reduced ? {} : { opacity: [0.45, 0.6, 0.45], scale: [1, 1.02, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: EASE_IO }}
          d="M 0 300 C 180 260 420 360 600 320 C 780 280 980 220 1200 260 L 1200 800 L 0 800 Z"
          fill="url(#pg2)"
          filter="url(#pblur)"
        />
      </g>

      <g style={{ transform: tx3 }}>
        <motion.circle
          cx="900"
          cy="680"
          r="280"
          fill="url(#pg3)"
          filter="url(#pblur)"
          initial={{ scale: 0.97, opacity: 0.6 }}
          animate={reduced ? {} : { scale: [0.97, 1.02, 0.97], opacity: [0.55, 0.65, 0.55] }}
          transition={{ duration: 14, repeat: Infinity, ease: EASE_IO }}
        />
      </g>

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

export default function ProjectsSection() {
  const prefersReduced = useReducedMotion();
  const [sections, setSections] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tiltX = useSpring(mx, { stiffness: 80, damping: 15, mass: 0.3 });
  const tiltY = useSpring(my, { stiffness: 80, damping: 15, mass: 0.3 });

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    const onMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      mx.set((e.clientX / innerWidth - 0.5) * 10);
      my.set((e.clientY / innerHeight - 0.5) * -10);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      mql.removeEventListener("change", onChange);
      window.removeEventListener("mousemove", onMove);
    };
  }, [mx, my]);

  // подгрузка HTML-доков для карусели
  useEffect(() => {
    const baseFiles = ["first", "second"];
    const files = baseFiles.map((name) => `/projects/${name}_${isMobile ? "mobile" : "desktop"}.html`);
    let alive = true;
    (async () => {
      try {
        const texts = await Promise.all(
          files.map(async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Не удалось загрузить ${url}`);
            return res.text();
          })
        );
        if (alive) setSections(texts);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isMobile]);

  const chips = ["Веб", "Мобайл", "Интеграции", "CRM/ERP", "Security", "Демо-страницы"];

  return (
    <section id="portfolio" className="relative isolate overflow-hidden bg-white text-neutral-900 scroll-mt-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent z-10" />

      <OrbitRings />
      <ProjectsBackground tiltX={tiltX.get() || 0} tiltY={tiltY.get() || 0} reduced={!!prefersReduced} />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
        <div className="md:hidden mb-4">
          <h2 className="text-3xl font-semibold tracking-tight">Наши проекты</h2>
        </div>

        <div className="grid items-start gap-8 md:gap-12 md:grid-cols-[minmax(0,3.6fr)_minmax(0,2fr)]">
          <div className="-mx-4 md:mx-0 h-[clamp(560px,85svh,620px)]">
            <div className="relative h-full rounded-none md:rounded-3xl ring-1 ring-black/10 bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,.25)] overflow-hidden">
              <span className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-transparent" />
              <CarouselClient sections={sections} basePath="/projects/" />
            </div>
          </div>

          <motion.aside
            className="relative px-1 md:px-0 md:sticky md:top-24"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ type: "tween", duration: 0.7, ease: EASE_IO }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-semibold tracking-tight"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ type: "tween", duration: 0.6, ease: EASE_IO }}
            >
              Наши проекты
            </motion.h2>

            <p className="mt-3 text-[15px] text-neutral-600 leading-relaxed">
              Подборка реальных кейсов, демо и объектов из нашего стека. Аккуратный UI,
              поддерживаемый код и прозрачные сроки.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {chips.map((t, i) => (
                <motion.span
                  key={t}
                  className="rounded-full bg-white/70 px-3 py-1 text-sm ring-1 ring-black/10 backdrop-blur-md shadow-sm"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  animate={prefersReduced ? {} : { y: [0, -2, 0] }}
                  transition={{ type: "tween", duration: 2.0, ease: EASE_IO, repeat: Infinity, delay: 0.08 * i }}
                >
                  {t}
                </motion.span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              <a
                href="#contact"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black text-white px-4 py-2 text-sm font-medium shadow hover:-translate-y-0.5 transition"
              >
                Обсудить проект
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="/portfolio"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-medium ring-1 ring-black/10 hover:bg-black/5 transition"
              >
                Все кейсы
              </a>
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  );
}
