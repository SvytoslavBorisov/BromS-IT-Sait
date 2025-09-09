// components/Features.tsx
"use client";

import { useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { features } from "../data/landingData";
import { motion, useReducedMotion } from "framer-motion";

const EASE_IO = [0.4, 0.0, 0.2, 1] as const;

export default function Features() {
  const reduced = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollByCards = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // ширина карточки + gap
    const card = el.querySelector<HTMLElement>("[data-card]");
    const cardW = card ? card.offsetWidth : 320;
    const gap = 16; // соответствует gap-4
    el.scrollBy({ left: dir * (cardW + gap) * 1.2, behavior: "smooth" });
  };

  return (
    <section className="relative z-10" aria-label="Ключевые возможности">
      <div className="mx-auto max-w-7xl px-6 pt-14 md:pt-18">
        <motion.h2
          className="mb-3 text-2xl md:text-3xl font-semibold tracking-tight text-white"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: "tween", duration: 0.5, ease: EASE_IO }}
        >
          Возможности
        </motion.h2>

        <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* ====== Мобильная карусель (≤ md): горизонтальный свайп ====== */}
        <div className="md:hidden relative">
          {/* стрелки навигации (опционально) */}
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 flex items-center justify-between px-1">
            <button
              onClick={() => scrollByCards(-1)}
              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/15 transition"
              aria-label="Назад"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={() => scrollByCards(1)}
              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/15 transition"
              aria-label="Вперёд"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div
            ref={scrollerRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-6 px-6 scroll-smooth
                       [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
          >
            {features.map((f) => (
              <div
                key={f.title}
                data-card
                className="snap-start shrink-0"
                style={{
                  // ширина карточки на мобиле — адаптивная, но не «резиновая»
                  width: "min(80vw, 360px)",
                }}
              >
                <CardShell>
                  <IconBadge><f.icon className="h-5 w-5 text-white" /></IconBadge>
                  <CardTitle className="text-xl text-white">{f.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-white/75">
                    {f.text}
                  </CardDescription>
                </CardShell>
              </div>
            ))}
          </div>
        </div>

        {/* ====== Десктопная сетка (≥ md): 3 колонки ====== */}
        <motion.div
          className="hidden md:grid md:grid-cols-3 gap-5 md:gap-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.45 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={{
                hidden: { opacity: 0, y: 14 },
                show:   { opacity: 1, y: 0, transition: { type: "tween", duration: 0.5, ease: EASE_IO } },
              }}
            >
              <CardShell>
                <IconBadge><f.icon className="h-5 w-5 text-white" /></IconBadge>
                <CardTitle className="text-xl text-white">{f.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-white/75">
                  {f.text}
                </CardDescription>
              </CardShell>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>
    </section>
  );
}

/* ==== Внутренние переиспользуемые куски ==== */
function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="group relative rounded-2xl p-[1px]
                 bg-[conic-gradient(from_210deg,rgba(255,255,255,.12),rgba(255,255,255,.02),rgba(255,255,255,.12))]"
    >
      <Card
        className="h-full rounded-[1rem] border border-white/10 overflow-hidden
                   bg-[linear-gradient(180deg,rgba(0,0,0,.78),rgba(0,0,0,.52))]
                   shadow-[0_20px_80px_-30px_rgba(0,0,0,.8)]"
      >
        {/* глянец по краю */}
        <span className="pointer-events-none absolute inset-0 rounded-[1rem] ring-1 ring-inset ring-white/10" />
        {/* умеренная внутренняя сетка */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[.06]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <CardHeader className="relative space-y-3">{children}</CardHeader>
      </Card>
    </div>
  );
}

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl
                 bg-[linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.06))]
                 ring-1 ring-white/15"
    >
      {children}
    </div>
  );
}
