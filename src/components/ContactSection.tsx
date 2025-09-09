// components/ContactSection.tsx
"use client";

import ContactForm from "@/components/ContactForm";
import { motion, useReducedMotion } from "framer-motion";
import React from "react";

/* ===== Константы вне рендера ===== */
const EASE = [0.4, 0, 0.2, 1] as const;
const VIEWPORT_06_ONCE = { amount: 0.6, once: true } as const;
const VIEWPORT_055_ONCE = { amount: 0.55, once: true } as const;
const CHIPS = ["Next.js", "React", "Интеграции", "Безопасность", "Поддержка"] as const;

/* Статические локальные стили (styled-jsx) */
const BG_CSS = `
  .aurora { position:absolute; filter:blur(80px); opacity:.42; mix-blend-mode:multiply; }
  .a1 { width:36rem; height:36rem; right:-8rem; top:-6rem;
        background:radial-gradient(50% 50% at 50% 50%, #f5f5f5 0%, rgba(255,255,255,0) 60%);
        animation: floatA 20s ease-in-out infinite; }
  .a2 { width:28rem; height:28rem; left:8%; bottom:-6rem;
        background:radial-gradient(50% 50% at 50% 50%, #efefef 0%, rgba(255,255,255,0) 60%);
        animation: floatB 24s ease-in-out infinite; }
  .a3 { width:22rem; height:22rem; right:22%; bottom:-10rem;
        background:radial-gradient(50% 50% at 50% 50%, #ffffff 0%, rgba(255,255,255,0) 60%);
        animation: floatC 28s ease-in-out infinite; }

  @keyframes floatA{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(-4%,6%,0)}100%{transform:translate3d(0,0,0)}}
  @keyframes floatB{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(6%,-4%,0)}100%{transform:translate3d(0,0,0)}}
  @keyframes floatC{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(-3%,-6%,0)}100%{transform:translate3d(0,0,0)}}

  .gridlines{
    position:absolute; inset:0; opacity:.06;
    background-image:radial-gradient(circle at 1px 1px, #000 1px, transparent 0);
    background-size:22px 22px;
    mask-image:linear-gradient(to bottom, transparent, black 12%, black 88%, transparent);
    animation:gridShift 40s linear infinite;
  }
  @keyframes gridShift{from{transform:translate3d(0,0,0)}to{transform:translate3d(-22px,-22px,0)}}

  /* Отключение анимаций через класс .reduced — без динамического CSS */
  .reduced .a1, .reduced .a2, .reduced .a3, .reduced .gridlines { animation: none !important; }

  /* Также уважаем системную настройку */
  @media (prefers-reduced-motion: reduce) {
    .a1, .a2, .a3, .gridlines { animation: none !important; }
  }
`;

/* ===== Фон секции: аврора + сетка под контентом (pure) ===== */
const ContactBackground = React.memo(function ContactBackground({ reduced }: { reduced: boolean }) {
  return (
    <>
      {/* «шторы» для мягких стыков */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white to-transparent z-0" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent z-0" />

      {/* аврора + сетка */}
      <div className={`pointer-events-none absolute inset-0 -z-10 ${reduced ? "reduced" : ""}`}>
        <div className="absolute -top-16 -left-24 h-[26rem] w-[26rem] rounded-full bg-black/[0.04] blur-3xl" />
        <div className="aurora a1" />
        <div className="aurora a2" />
        <div className="aurora a3" />
        <div className="gridlines" />
      </div>

      <style jsx>{BG_CSS}</style>
    </>
  );
});

/* ===== Основная секция ===== */
export default function ContactSection() {
  const reduced = useReducedMotion();

  return (
    <section id="contact" className="relative isolate overflow-hidden bg-white text-neutral-900 scroll-mt-28">
      <ContactBackground reduced={!!reduced} />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8 py-20 md:py-28">
        <div className="grid gap-10 md:gap-16 md:grid-cols-2 items-center">
          {/* Левый блок */}
          <div>
            <motion.h2
              className="text-4xl md:text-5xl font-semibold tracking-tight"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_06_ONCE}
              transition={{ duration: 0.6, ease: EASE }}
            >
              Свяжитесь с нами
            </motion.h2>

            <motion.p
              className="mt-4 text-neutral-600 leading-relaxed"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT_06_ONCE}
              transition={{ duration: 0.65, ease: EASE, delay: 0.08 }}
            >
              Опишите задачу — вернёмся с вариантами решения и оценкой сроков.
              Минимум формальностей, максимум пользы.
            </motion.p>

            {/* Бейджи */}
            <div className="mt-6 flex flex-wrap gap-2">
              {CHIPS.map((t, i) => (
                <motion.span
                  key={t}
                  className="rounded-full bg-white/70 px-3 py-1 text-sm ring-1 ring-black/10 backdrop-blur-md shadow-sm"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={VIEWPORT_06_ONCE}
                  animate={reduced ? {} : { y: [0, -2, 0] }}
                  transition={{ duration: 2.0, ease: EASE, repeat: Infinity, delay: 0.08 * i }}
                >
                  {t}
                </motion.span>
              ))}
            </div>

            {/* Быстрые контакты */}
            <div className="mt-8 grid grid-cols-2 gap-3 max-w-sm">
              <a
                href="https://t.me/+fnL2WMHosstjY2Qy"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-black text-white px-4 py-3 text-sm font-medium shadow hover:-translate-y-0.5 transition"
              >
                Telegram
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M21.5 4.5 3.7 11.6a1 1 0 0 0 0 1.8l4.3 1.5 1.6 4.8a1 1 0 0 0 1.9.2l2.4-4.3 4.6 3.4a1 1 0 0 0 1.9-.8l2.4-12a1 1 0 0 0-1.6-1.2Z"/>
                </svg>
              </a>
              <a
                href="mailto:bromsit@mail.ru"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium ring-1 ring-black/10 hover:bg-black/5 transition"
              >
                Написать на почту
              </a>
            </div>

            <div className="mt-5 text-xs text-neutral-500">
              Обычно отвечаем в течение <span className="font-medium text-neutral-700">1–2 часов</span> в будни.
            </div>
          </div>

          {/* Правая стеклянная карточка с формой */}
          <motion.div
            className="relative rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-black/10 shadow-[0_20px_6px_-20px_rgba(0,0,0,.25)] p-5 md:p-8"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={VIEWPORT_055_ONCE}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <span className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-transparent" />
            <ContactForm />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
