// components/Features.tsx
"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { features } from "../data/landingData";
import { motion, useReducedMotion } from "framer-motion";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";

const EASE_IO = [0.4, 0.0, 0.2, 1] as const;

export default function Features() {
  const reduced = useReducedMotion();

  return (
    <section className="relative z-10" aria-label="Ключевые возможности">
      <div className="mx-auto max-w-7xl pt-14 md:pt-18">
        <motion.h2
          className="mb-3 text-2xl px-6 md:text-3xl font-semibold tracking-tight text-white"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: "tween", duration: 0.5, ease: EASE_IO }}
        >
          Возможности
        </motion.h2>

        <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Мобайл: карусель без стрелок + красивый отступ первой карточке */}
        <div className="md:hidden">
          <HorizontalCarousel
            items={features.map((f) => (
              <CardShell key={f.title}>
                <IconBadge><f.icon className="h-5 w-5 text-white" /></IconBadge>
                <CardTitle className="text-xl text-white">{f.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-white/75">
                  {f.text}
                </CardDescription>
              </CardShell>
            ))}
            cardWidth="min(80vw, 360px)"
            gapPx={16}
            showArrows={false}
            edgeGutterPx={24}       // совпадает с контейнерным px-6
            firstItemOffsetPx={16}  // добавочный «воздух» слева
            ariaLabel="Свайповая карусель возможностей"
          />
        </div>

        {/* Десктопная сетка */}
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
        <span className="pointer-events-none absolute inset-0 rounded-[1rem] ring-1 ring-inset ring-white/10" />
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
