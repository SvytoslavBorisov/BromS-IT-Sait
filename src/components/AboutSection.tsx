// components/AboutSection.tsx
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import {
  motion,
  useReducedMotion,
  useInView,
  animate,
  useMotionValue,
  useTransform,
} from "framer-motion";

/** ====== Easing (стабильные ссылки) ====== */
const EASE_IO = [0.4, 0.0, 0.2, 1] as const;
const EASE_LIN = [0, 0, 1, 1] as const;

/** ====== Стабильные options для viewport ====== */
const VIEWPORT_06_ONCE = { amount: 0.6, once: true } as const;
const VIEWPORT_05_ONCE = { amount: 0.5, once: true } as const;

/** ====== Данные вне рендера ====== */
const CHIPS = ["Next.js", "React", "Node.js", "iOS/Android", "CRM/ERP", "Security"] as const;

const WHAT_WE_DO: React.ReactNode[] = [
  <>Разработка веб-приложений <span className="font-medium">Next.js, React, Node.js</span></>,
  <>Мобильные приложения <span className="font-medium">iOS, Android, React Native</span></>,
  <>Интеграции и настройка корпоративных <span className="font-medium">CRM/ERP</span></>,
  <>Безопасность: <span className="font-medium">шифрование, подписи, аудит</span></>,
  <>Поддержка и развитие проектов</>,
];

/** ====== Белые «шторы» сверху/снизу (pure) ====== */
const EdgeFades = React.memo(function EdgeFades() {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white to-transparent z-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent z-0" />
    </>
  );
});

/** ====== Орбитальные кольца (pure) ====== */
const OrbitRings = React.memo(function OrbitRings() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-2 rounded-full border border-black/5 animate-[spin_70s_linear_infinite]" />
      <div className="absolute inset-14 rounded-full border border-black/5 animate-[spin_100s_linear_infinite_reverse]" />
      <div className="absolute inset-24 rounded-full border border-black/5 animate-[spin_140s_linear_infinite]" />
    </div>
  );
});

/** ====== Фон секции: аврора + сетка + частицы ====== */
const AboutBackground = React.memo(function AboutBackground({ reduced }: { reduced: boolean }) {
  // сетка и частицы считаем один раз
  const gridV = useMemo(() => Array.from({ length: 16 }, (_, i) => (i * 1200) / 15), []);
  const gridH = useMemo(() => Array.from({ length: 10 }, (_, i) => (i * 760) / 9), []);
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        cx: `${(i * 37) % 100}%`,
        cy: `${(i * 29) % 100}%`,
        delay: (i % 12) * 0.45,
      })),
    []
  );

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
        <filter id="ablur">
          <feGaussianBlur stdDeviation="28" edgeMode="duplicate" />
        </filter>
        <filter id="agrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.035" />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* Аврора */}
      <motion.path
        d="M 0 440 C 200 480 360 360 600 410 C 840 460 980 320 1200 350 L 1200 760 L 0 760 Z"
        fill="url(#abg1)"
        filter="url(#ablur)"
        opacity="0.6"
        initial={false}
        animate={
          reduced
            ? {}
            : {
                d: [
                  "M 0 440 C 200 480 360 360 600 410 C 840 460 980 320 1200 350 L 1200 760 L 0 760 Z",
                  "M 0 440 C 220 360 380 520 600 470 C 820 430 1020 360 1200 390 L 1200 760 L 0 760 Z",
                  "M 0 440 C 200 480 360 360 600 410 C 840 460 980 320 1200 350 L 1200 760 L 0 760 Z",
                ],
              }
        }
        transition={{ duration: 16, repeat: Infinity, ease: EASE_IO }}
      />
      <motion.path
        d="M 0 280 C 180 230 420 320 600 300 C 780 280 980 240 1200 280 L 1200 760 L 0 760 Z"
        fill="url(#abg2)"
        filter="url(#ablur)"
        opacity="0.45"
        initial={false}
        animate={
          reduced
            ? {}
            : {
                d: [
                  "M 0 280 C 180 230 420 320 600 300 C 780 280 980 240 1200 280 L 1200 760 L 0 760 Z",
                  "M 0 280 C 240 340 420 240 600 280 C 780 320 980 280 1200 260 L 1200 760 L 0 760 Z",
                  "M 0 280 C 180 230 420 320 600 300 C 780 280 980 240 1200 280 L 1200 760 L 0 760 Z",
                ],
              }
        }
        transition={{ duration: 20, repeat: Infinity, ease: EASE_IO }}
      />

      {/* Сетка */}
      <g stroke="rgba(0,0,0,0.06)" strokeWidth="1">
        {gridV.map((x, i) => (
          <motion.path
            key={`v-${i}`}
            d={`M ${x} 0 L ${x} 760`}
            strokeDasharray="100 100"
            initial={{ strokeDashoffset: 0, opacity: 0.5 }}
            animate={reduced ? { opacity: 0.35 } : { strokeDashoffset: [0, 100, 0], opacity: 0.35 }}
            transition={{ duration: 22, repeat: Infinity, ease: EASE_LIN }}
          />
        ))}
        {gridH.map((y, i) => (
          <motion.path
            key={`h-${i}`}
            d={`M 0 ${y} L 1200 ${y}`}
            strokeDasharray="100 100"
            initial={{ strokeDashoffset: 0, opacity: 0.5 }}
            animate={reduced ? { opacity: 0.35 } : { strokeDashoffset: [0, 100, 0], opacity: 0.35 }}
            transition={{ duration: 22, repeat: Infinity, ease: EASE_LIN }}
          />
        ))}
      </g>

      {/* Частицы */}
      <g>
        {particles.map(({ cx, cy, delay }, i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r="1.5"
            fill="rgba(0,0,0,0.12)"
            initial={{ opacity: 0.2, translateY: 0 }}
            animate={reduced ? {} : { opacity: [0.2, 0.55, 0.2], translateY: [-6, 4, -6] }}
            transition={{ duration: 10, repeat: Infinity, ease: EASE_IO, delay }}
          />
        ))}
      </g>

      {/* Лёгкое «зерно» */}
      <rect x="0" y="0" width="1200" height="760" filter="url(#agrain)" />
    </svg>
  );
});

/** ====== Иконка-галочка (pure) ====== */
const IconCheck = React.memo(function IconCheck() {
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
});

/** ====== Счётчик (аним. числа при появлении) ====== */
const Stat = React.memo(function Stat({
  label,
  to,
  suffix = "",
}: {
  label: string;
  to: number;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, VIEWPORT_06_ONCE);
  const mv = useMotionValue(0);
  const value = useTransform(mv, (v) => Math.round(v));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, { duration: 1.4, ease: EASE_IO });
    return () => controls.stop();
  }, [inView, to, mv]);

  return (
    <div ref={ref} className="rounded-2xl bg-white/60 backdrop-blur ring-1 ring-black/10 px-4 py-3 shadow-sm">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">
        <motion.span>{value}</motion.span>
        {suffix}
      </div>
    </div>
  );
});

/** ====== Карточка шага процесса (pure) ====== */
const StepCard = React.memo(function StepCard({
  title,
  text,
  delay = 0,
}: {
  title: string;
  text: string;
  delay?: number;
}) {
  return (
    <motion.div
      className="group relative rounded-2xl p-[1px]"
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT_06_ONCE}
      transition={{ duration: 0.55, ease: EASE_IO, delay }}
    >
      <div className="absolute inset-0 rounded-2xl bg-[conic-gradient(from_0deg,rgba(0,0,0,0.08),rgba(0,0,0,0.02),rgba(0,0,0,0.08))]" />
      <div className="relative rounded-[1rem] bg-white/70 ring-1 ring-black/10 p-4 backdrop-blur group-hover:shadow-md transition-shadow">
        <div className="text-sm font-medium">{title}</div>
        <p className="mt-1 text-sm text-neutral-700 leading-relaxed">{text}</p>
        <span className="pointer-events-none absolute -inset-10 rounded-2xl bg-gradient-to-br from-white/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  );
});

/** ====== Главная секция «О нас» ====== */
export default function AboutSection() {
  const prefersReduced = useReducedMotion();

  return (
    <section id="about" className="relative isolate overflow-hidden bg-white text-neutral-900 scroll-mt-28">
      {/* Фон и орбиты */}
      <AboutBackground reduced={!!prefersReduced} />
      <OrbitRings />
      {/* Мягкие стыки */}
      <EdgeFades />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
        <div className="grid items-start gap-10 md:gap-16 md:grid-cols-2">
          {/* Левая колонка — рассказ + чипсы */}
          <div>
            <motion.h2
              className="text-4xl md:text-5xl font-semibold tracking-tight"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_06_ONCE}
              transition={{ duration: 0.6, ease: EASE_IO }}
            >
              О нас
            </motion.h2>

            <motion.p
              className="mt-4 text-neutral-600 leading-relaxed"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_06_ONCE}
              transition={{ duration: 0.65, ease: EASE_IO, delay: 0.1 }}
            >
              «БромС» — команда, которая делает чистые интерфейсы, чистый код и чистые IT-решения:
              от веба и мобильных приложений до интеграций и безопасности. Работаем быстро, прозрачно,
              с фокусом на измеримый результат и долгую поддержку.
            </motion.p>

            <motion.p
              className="mt-3 text-neutral-600 leading-relaxed"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_06_ONCE}
              transition={{ duration: 0.65, ease: EASE_IO, delay: 0.18 }}
            >
              Мы начинаем с цели и аудитории, затем проектируем маршруты, шлифуем UI/UX и закрываем бизнес-метрики.
              Всё — без лишнего визуального шума и «магии плагинов».
            </motion.p>

            {/* Чипсы */}
            <div className="mt-6 flex flex-wrap gap-2">
              {CHIPS.map((t, i) => (
                <motion.span
                  key={t}
                  className="rounded-full bg-white/70 px-3 py-1 text-sm ring-1 ring-black/10 backdrop-blur-md shadow-sm"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_06_ONCE}
                  animate={!prefersReduced ? { y: [0, -2, 0] } : {}}
                  transition={{ duration: 2, ease: EASE_IO, repeat: Infinity, delay: 0.08 * i }}
                >
                  {t}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Правая колонка — стеклянная карточка + список + факты */}
          <motion.div
            className="relative rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-black/10 shadow-[0_40px_120px_-40px_rgba(0,0,0,.25)] p-5 md:p-8"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={VIEWPORT_05_ONCE}
            transition={{ duration: 0.7, ease: EASE_IO }}
          >
            <span className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-transparent" />
            <h3 className="relative z-10 text-2xl font-semibold">Что мы делаем</h3>

            <ul className="relative z-10 mt-4 space-y-4">
              {WHAT_WE_DO.map((content, i) => (
                <motion.li
                  key={i}
                  className="flex gap-3"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_06_ONCE}
                  transition={{ duration: 0.5, ease: EASE_IO, delay: 0.05 * i }}
                >
                  <IconCheck />
                  <p className="leading-relaxed">{content}</p>
                </motion.li>
              ))}
            </ul>

            {/* Мини-факты (аним. счётчики) */}
            <div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
              <Stat label="Срок внедрения MVP" to={4} suffix="–8 нед." />
              <Stat label="Проектов в поддержке" to={24} />
              <Stat label="Средний TTV" to={14} suffix=" дн." />
              <Stat label="Измеримая цель" to={100} suffix="%" />
            </div>
          </motion.div>
        </div>

        {/* Процесс (3 шага) */}
        <div className="mt-12 md:mt-16">
          <motion.h3
            className="text-xl md:text-2xl font-semibold"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT_06_ONCE}
            transition={{ duration: 0.6, ease: EASE_IO }}
          >
            Как мы работаем
          </motion.h3>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <StepCard
              title="1. Диагностика"
              text="Формулируем бизнес-цель, проверяем гипотезы, собираем требования и ограничения. Переводим это в измеримые метрики."
              delay={0.05}
            />
            <StepCard
              title="2. Проектирование и запуск"
              text="Прорабатываем UX/UI, архитектуру и интеграции. Параллелим фичи, выходим в MVP без технического долга."
              delay={0.1}
            />
            <StepCard
              title="3. Рост и поддержка"
              text="Доводим продукт до целевых показателей, наблюдаем метрики, оптимизируем стоимость и повышаем конверсию."
              delay={0.15}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
