// src/components/ProjectsSection.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
  MotionValue,
} from "framer-motion";
import CarouselClient from "@/app/CarouselClient";

const EASE_IO = [0.4, 0.0, 0.2, 1] as const;

// Орбиты грузим лениво, чтобы не мешали TTI
const OrbitRings = dynamic(() => import("@/components/OrbitRings"), { ssr: false });

/** ===================== ЛЁГКИЙ ФОН СЕКЦИИ ===================== **/
function ProjectsBackground({
  x,
  y,
  reduced,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  reduced: boolean;
}) {
  // Параллакс без ре-рендеров React
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
        {/* Ограничили область блюра — быстрее */}
        <filter id="pblur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="10" edgeMode="duplicate" />
        </filter>
        <style>{`
          .p { transform-origin: 50% 50%; will-change: transform, opacity; }
          .p1 { ${reduced ? "" : "animation: pulse1 16s ease-in-out infinite;"} }
          .p2 { ${reduced ? "" : "animation: pulse2 18s ease-in-out infinite;"} }
          .p3 { ${reduced ? "" : "animation: pulse3 14s ease-in-out infinite;"} }
          @keyframes pulse1 { 0%{opacity:.55; transform:scale(1)} 50%{opacity:.7; transform:scale(1.03)} 100%{opacity:.55; transform:scale(1)} }
          @keyframes pulse2 { 0%{opacity:.45; transform:scale(1)} 50%{opacity:.6; transform:scale(1.02)} 100%{opacity:.45; transform:scale(1)} }
          @keyframes pulse3 { 0%{opacity:.55; transform:scale(.97)} 50%{opacity:.65; transform:scale(1.02)} 100%{opacity:.55; transform:scale(.97)} }
          @media (prefers-reduced-motion: reduce) {
            .p1,.p2,.p3 { animation: none !important; }
          }
        `}</style>
      </defs>

      {/* только параллакс через MotionValue; пульсация — CSS */}
      <motion.g style={{ x: g1x, y: g1y }}>
        <path
          d="M 0 520 C 220 540 340 380 600 420 C 860 460 980 320 1200 340 L 1200 800 L 0 800 Z"
          className="p p1"
          fill="url(#pg1)"
          filter="url(#pblur)"
        />
      </motion.g>

      <motion.g style={{ x: g2x, y: g2y }}>
        <path
          d="M 0 300 C 180 260 420 360 600 320 C 780 280 980 220 1200 260 L 1200 800 L 0 800 Z"
          className="p p2"
          fill="url(#pg2)"
          filter="url(#pblur)"
        />
      </motion.g>

      <motion.g style={{ x: g3x, y: g3y }}>
        <circle cx="900" cy="680" r="280" className="p p3" fill="url(#pg3)" filter="url(#pblur)" />
      </motion.g>

      {/* статичная сетка */}
      <g stroke="rgba(0,0,0,0.05)" strokeWidth="1" shapeRendering="crispEdges">
        {grid.vs.map((x) => (
          <path key={`v-${x}`} d={`M ${x} 0 L ${x} 800`} />
        ))}
        {grid.hs.map((y) => (
          <path key={`h-${y}`} d={`M 0 ${y} L 1200 ${y}`} />
        ))}
      </g>
    </svg>
  );
}

/** ===================== СЕКЦИЯ ПРОЕКТОВ ===================== **/
export default function ProjectsSection() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);

  const [sections, setSections] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Параллакс-значения
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tiltX = useSpring(mx, { stiffness: 80, damping: 15, mass: 0.3 });
  const tiltY = useSpring(my, { stiffness: 80, damping: 15, mass: 0.3 });

  // rAF-троттлинг и отключение на touch-устройствах
  useEffect(() => {
    if (reduced) return;
    if (typeof window === "undefined") return;
    const supportsFine = window.matchMedia?.("(pointer: fine)")?.matches;
    if (!supportsFine) return;

    const el = sectionRef.current ?? document.body;
    let raf = 0;
    let lastX = 0;
    let lastY = 0;

    const onMove = (e: PointerEvent) => {
      const rect = sectionRef.current?.getBoundingClientRect();
      const w = rect?.width ?? window.innerWidth;
      const h = rect?.height ?? window.innerHeight;
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;

      lastX = ((e.clientX - left) / w - 0.5) * 10;
      lastY = ((e.clientY - top) / h - 0.5) * -10;

      if (!raf) {
        raf = requestAnimationFrame(() => {
          mx.set(lastX);
          my.set(lastY);
          raf = 0;
        });
      }
    };
    const onLeave = () => {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          mx.set(0);
          my.set(0);
          raf = 0;
        });
      }
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });

    return () => {
      el.removeEventListener("pointermove", onMove as any);
      el.removeEventListener("pointerleave", onLeave as any);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mx, my, reduced]);

  // Детект мобильной вёрстки
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Подгрузка HTML для карусели (с AbortController и кешем)
  useEffect(() => {
    const ctrl = new AbortController();
    const base = ["first", "second"];
    const urls = base.map(
      (name) => `/projects/${name}_${isMobile ? "mobile" : "desktop"}.html`
    );

    (async () => {
      try {
        const texts = await Promise.all(
          urls.map(async (u) => {
            const res = await fetch(u, { signal: ctrl.signal, cache: "force-cache" });
            if (!res.ok) throw new Error(`Не удалось загрузить ${u}`);
            return res.text();
          })
        );
        setSections(texts);
      } catch (e) {
        if ((e as any)?.name !== "AbortError") console.error(e);
      }
    })();

    return () => ctrl.abort();
  }, [isMobile]);

  const chips = useMemo(
    () => ["Веб", "Мобайл", "Интеграции", "CRM/ERP", "Security", "Демо-страницы"],
    []
  );

  return (
    <section
      ref={sectionRef}
      id="portfolio"
      className="relative isolate overflow-hidden bg-white text-neutral-900 scroll-mt-28"
      style={{ contain: "layout paint" }}
    >
      {/* мягкие шторы */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent z-10" />

      <div className="pointer-events-none">
        <OrbitRings />
      </div>
      {/* Передаём MotionValue, а не .get() */}
      <ProjectsBackground x={tiltX} y={tiltY} reduced={!!reduced} />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
        <div className="md:hidden mb-4">
          <h2 className="text-3xl font-semibold tracking-tight">Наши проекты</h2>
        </div>

        <div className="grid items-start gap-8 md:gap-12 md:grid-cols-[minmax(0,3.6fr)_minmax(0,2fr)]">
          {/* Левая колонка: карусель */}
          <div className="-mx-4 md:mx-0 h-[clamp(560px,85svh,620px)]">
            <div
              className="relative h-full rounded-none md:rounded-3xl ring-1 ring-black/10 bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,.25)] overflow-hidden"
              style={{ contain: "paint" }}
            >
              <span className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-transparent" />
              <CarouselClient sections={sections} basePath="/projects/" />
            </div>
          </div>

          {/* Правая колонка: текст/кнопки */}
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

            {/* Чипсы — CSS-анимация (0 JS-циклов) */}
            <div className="mt-6 flex flex-wrap gap-2">
              {chips.map((t, i) => (
                <span
                  key={t}
                  className="rounded-full bg-white/70 px-3 py-1 text-sm ring-1 ring-black/10 backdrop-blur-md shadow-sm chip"
                  style={{ animationDelay: reduced ? "0s" : `${0.08 * i}s` }}
                >
                  {t}
                </span>
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

      <style>{`
        .chip {
          will-change: transform;
          ${reduced ? "" : "animation: chip-bob 2000ms cubic-bezier(.4,0,.2,1) infinite;"}
        }
        @keyframes chip-bob {
          0% { transform: translateY(0) }
          50% { transform: translateY(-2px) }
          100% { transform: translateY(0) }
        }
        @media (prefers-reduced-motion: reduce) {
          .chip { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
