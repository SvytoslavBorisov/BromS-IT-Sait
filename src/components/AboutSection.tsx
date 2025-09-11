// components/AboutSection.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useReducedMotion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  animate,
} from "framer-motion";

const EASE_CSS = "cubic-bezier(0.4, 0, 0.2, 1)";
const EASE_FR = [0.4, 0, 0.2, 1] as const;
const NF = new Intl.NumberFormat("ru-RU");

/* ---------- утилиты ---------- */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const mq = matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mq.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile;
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/* ---------- фон: одинаковая структура на SSR/клиенте ---------- */
function AboutBackground({ animated }: { animated: boolean }) {
  const grid = useMemo(() => {
    const vs = Array.from({ length: 10 }, (_, i) => (i * 1200) / 9);
    const hs = Array.from({ length: 6 }, (_, i) => (i * 760) / 5);
    return { vs, hs };
  }, []);

  return (
    <svg
      className="absolute inset-0 -z-20 h-full w-full pointer-events-none [mask-image:radial-gradient(1200px_760px_at_50%_40%,white,transparent_85%)]"
      viewBox="0 0 1200 760"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id="abg1" cx="25%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#c7d2fe" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="abg2" cx="80%" cy="10%" r="80%">
          <stop offset="0%" stopColor="#f5d0fe" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#7dd3fc" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* ВСЕГДА присутствуют: одинаковое дерево на SSR/клиенте */}
        <filter id="ablur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="10" edgeMode="duplicate" />
        </filter>
        <style>{`
          .abg { transform-origin: 50% 50%; will-change: transform, opacity; }
          .abg1 { animation: abg-pulse1 16s ${EASE_CSS} infinite; }
          .abg2 { animation: abg-pulse2 18s ${EASE_CSS} infinite; }
          @keyframes abg-pulse1 { 0%{opacity:.6; transform:scale(1)} 50%{opacity:.72; transform:scale(1.02)} 100%{opacity:.6; transform:scale(1)} }
          @keyframes abg-pulse2 { 0%{opacity:.45; transform:scale(1)} 50%{opacity:.58; transform:scale(1.02)} 100%{opacity:.45; transform:scale(1)} }
        `}</style>
      </defs>

      <g shapeRendering="optimizeSpeed">
        <path
          d="M 0 440 C 200 480 360 360 600 410 C 840 460 980 320 1200 350 L 1200 760 L 0 760 Z"
          className={animated ? "abg abg1" : undefined}
          fill="url(#abg1)"
          filter={animated ? "url(#ablur)" : undefined}
        />
        <path
          d="M 0 280 C 180 230 420 320 600 300 C 780 280 980 240 1200 280 L 1200 760 L 0 760 Z"
          className={animated ? "abg abg2" : undefined}
          fill="url(#abg2)"
          filter={animated ? "url(#ablur)" : undefined}
        />
      </g>

      <g stroke="rgba(0,0,0,0.06)" strokeWidth="1" shapeRendering="crispEdges">
        {grid.vs.map((x) => <path key={`v-${x}`} d={`M ${x} 0 L ${x} 760`} opacity="0.35" />)}
        {grid.hs.map((y) => <path key={`h-${y}`} d={`M 0 ${y} L 1200 ${y}`} opacity="0.35" />)}
      </g>
    </svg>
  );
}

/* ---------- Stat: разделено на статичный и анимированный ---------- */
function StatStatic({
  label, to, suffix = "",
}: { label: string; to: number; suffix?: string }) {
  return (
    <div
      className="rounded-2xl bg-white/60 backdrop-blur ring-1 ring-black/10 px-4 py-3 shadow-sm"
      style={{ contain: "paint" }}
    >
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">
        {NF.format(to)}{suffix}
      </div>
    </div>
  );
}

function StatAnimated({
  label, to, suffix = "",
}: { label: string; to: number; suffix?: string }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(boxRef, { amount: 0.6, once: true });

  const mv = useMotionValue(0);
  useMotionValueEvent(mv, "change", (v) => {
    if (spanRef.current) {
      spanRef.current.textContent = NF.format(Math.round(v));
    }
  });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration: 1.2, ease: EASE_FR });
    return () => controls.stop();
  }, [inView, to, mv]);

  return (
    <div
      ref={boxRef}
      className="rounded-2xl bg-white/60 backdrop-blur ring-1 ring-black/10 px-4 py-3 shadow-sm"
      style={{ willChange: "transform", contain: "paint" }}
    >
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">
        <span ref={spanRef}>0</span>{suffix}
      </div>
    </div>
  );
}

/* ---------- StepCard: без/с анимацией ---------- */
function StepCard({
  title, text, delay = 0, animated,
}: { title: string; text: string; delay?: number; animated: boolean }) {
  if (!animated) {
    return (
      <div className="group relative rounded-2xl p-[1px]">
        <div className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_0deg,rgba(0,0,0,0.08),rgba(0,0,0,0.02),rgba(0,0,0,0.08))]" />
        <div className="relative rounded-[1rem] bg-white/70 ring-1 ring-black/10 p-4 backdrop-blur">
          <div className="text-sm font-medium [text-wrap:balance]">{title}</div>
          <p className="mt-1 text-sm text-neutral-700 leading-relaxed [text-wrap:balance]">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative rounded-2xl p-[1px] opacity-0 translate-y-[14px] will-change-transform"
      style={{ animation: `step-in 500ms ${EASE_CSS} ${delay}s both` }}
    >
      <div className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_0deg,rgba(0,0,0,0.08),rgba(0,0,0,0.02),rgba(0,0,0,0.08))]" />
      <div className="relative rounded-[1rem] bg-white/70 ring-1 ring-black/10 p-4 backdrop-blur transition-shadow group-hover:shadow-md">
        <div className="text-sm font-medium [text-wrap:balance]">{title}</div>
        <p className="mt-1 text-sm text-neutral-700 leading-relaxed [text-wrap:balance]">{text}</p>
        <span className="pointer-events-none absolute -inset-10 rounded-2xl bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <style>{`@keyframes step-in { 0% { opacity:0; transform: translateY(14px) } 100% { opacity:1; transform: translateY(0) } }`}</style>
    </div>
  );
}

/* ---------- Компонент секции ---------- */
export default function AboutSection() {
  const prefersReduced = useReducedMotion();
  const isMobile = useIsMobile();
  const mounted = useMounted();

  // Доп. перф-флаг: читаем только на клиенте (после маунта animated посчитается корректно)
  const [reduceMore, setReduceMore] = useState(false);
  useEffect(() => {
    const coarse = matchMedia("(pointer: coarse)").matches;
    const dm = (navigator as any).deviceMemory ?? 8;
    const hc = navigator.hardwareConcurrency ?? 8;
    setReduceMore(coarse || dm <= 4 || hc <= 4);
  }, []);

  // До маунта ВСЕГДА без анимаций → идентичный SSR и первый клиентский рендер
  const computedAnimated = !(isMobile || !!prefersReduced || reduceMore);
  const animated = mounted && computedAnimated;

  const chips = useMemo(
    () => ["Next.js", "React", "Node.js", "iOS/Android", "CRM/ERP", "Security"],
    []
  );

  return (
    <section
      id="about"
      className="relative isolate overflow-hidden bg-white text-neutral-900 scroll-mt-28"
      style={{ contain: "layout paint" }}
    >
      <AboutBackground animated={animated} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
        <div className="grid items-start gap-10 md:gap-16 md:grid-cols-2">
          <div>
            <h2
              className={
                animated
                  ? "text-4xl md:text-5xl font-semibold tracking-tight opacity-0 translate-y-[12px] will-change-transform"
                  : "text-4xl md:text-5xl font-semibold tracking-tight"
              }
              style={animated ? { animation: `fadeUp 600ms ${EASE_CSS} 0s both` } : undefined}
            >
              О нас
            </h2>

            <p
              className={
                animated
                  ? "mt-4 text-neutral-600 leading-relaxed opacity-0 translate-y-[12px] will-change-transform [text-wrap:balance]"
                  : "mt-4 text-neutral-600 leading-relaxed [text-wrap:balance]"
              }
              style={animated ? { animation: `fadeUp 600ms ${EASE_CSS} .08s both` } : undefined}
            >
              «БромС» — команда, которая делает чистые интерфейсы, чистый код и чистые IT-решения:
              от веба и мобильных приложений до интеграций и безопасности. Работаем быстро, прозрачно,
              с фокусом на измеримый результат и долгую поддержку.
            </p>

            <p
              className={
                animated
                  ? "mt-3 text-neutral-600 leading-relaxed opacity-0 translate-y-[12px] will-change-transform [text-wrap:balance]"
                  : "mt-3 text-neutral-600 leading-relaxed [text-wrap:balance]"
              }
              style={animated ? { animation: `fadeUp 600ms ${EASE_CSS} .16s both` } : undefined}
            >
              Мы начинаем с цели и аудитории, затем проектируем маршруты, шлифуем UI/UX и закрываем бизнес-метрики.
              Всё — без лишнего визуального шума и «магии плагинов».
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {chips.map((t, i) => (
                <span
                  key={t}
                  className="rounded-full bg-white/70 px-3 py-1 text-sm ring-1 ring-black/10 backdrop-blur-md shadow-sm"
                  style={
                    animated
                      ? { animation: `chip-bob 2000ms ${EASE_CSS} ${0.08 * i}s infinite`, willChange: "transform" }
                      : undefined
                  }
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div
            className={
              animated
                ? "relative rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-black/10 shadow-[0_40px_120px_-40px_rgba(0,0,0,.25)] p-5 md:p-8 opacity-0 translate-y-[16px] scale-[.98] will-change-transform"
                : "relative rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-black/10 shadow-[0_40px_120px_-40px_rgba(0,0,0,.25)] p-5 md:p-8"
            }
            style={animated ? { animation: `cardIn 700ms ${EASE_CSS} .1s both` } : undefined}
          >
            <span className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-transparent" />
            <h3 className="relative z-10 text-2xl font-semibold">Что мы делаем</h3>

            <ul className="relative z-10 mt-4 space-y-4">
              {[
                <>Разработка веб-приложений <span className="font-medium">Next.js, React, Node.js</span></>,
                <>Мобильные приложения <span className="font-medium">iOS, Android, React Native</span></>,
                <>Интеграции и настройка корпоративных <span className="font-medium">CRM/ERP</span></>,
                <>Безопасность: <span className="font-medium">шифрование, подписи, аудит</span></>,
                <>Поддержка и развитие проектов</>,
              ].map((content, i) => (
                <li
                  key={i}
                  className={animated ? "flex gap-3 opacity-0 translate-y-[8px] will-change-transform" : "flex gap-3"}
                  style={animated ? { animation: `fadeUp 450ms ${EASE_CSS} ${0.05 * i}s both` } : undefined}
                >
                  <IconCheck />
                  <p className="leading-relaxed [text-wrap:balance]">{content}</p>
                </li>
              ))}
            </ul>

            <div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
              {animated ? (
                <>
                  <StatAnimated label="Срок внедрения MVP" to={4} suffix="–8 нед." />
                  <StatAnimated label="Проектов в поддержке" to={24} />
                  <StatAnimated label="Средний TTV" to={14} suffix=" дн." />
                  <StatAnimated label="Измеримая цель" to={100} suffix="%" />
                </>
              ) : (
                <>
                  <StatStatic label="Срок внедрения MVP" to={4} suffix="–8 нед." />
                  <StatStatic label="Проектов в поддержке" to={24} />
                  <StatStatic label="Средний TTV" to={14} suffix=" дн." />
                  <StatStatic label="Измеримая цель" to={100} suffix="%" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* кейфреймы подключаем ТОЛЬКО если реально анимируем */}
        {animated && (
          <style>{`
            @keyframes fadeUp { 0%{opacity:0; transform:translateY(12px)} 100%{opacity:1; transform:translateY(0)} }
            @keyframes cardIn { 0%{opacity:0; transform:translateY(16px) scale(.98)} 100%{opacity:1; transform:translateY(0) scale(1)} }
            @keyframes chip-bob { 0%{transform:translateY(0)} 50%{transform:translateY(-2px)} 100%{transform:translateY(0)} }
          `}</style>
        )}
      </div>
    </section>
  );
}

/* ---------- иконка ---------- */
function IconCheck() {
  return (
    <svg
      className="mt-1 h-5 w-5 flex-none text-neutral-900"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
