// app/sections/Tools.tsx
"use client";

import Link from "next/link";
import { CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { btn } from "../ui/btnPresets";
import { publicTools } from "../data/landingData";
import { motion } from "framer-motion";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { CardShell, IconBadge } from "@/components/ui/CardShell";

const EASE_IO = [0.4, 0.0, 0.2, 1] as const;

export default function Tools() {
  return (
    <section id="tools" className="relative z-10" aria-label="Открытые инструменты">
      <div className="mx-auto max-w-7xl pt-14 md:pt-18">
        {/* Заголовок в стиле Features */}
        <motion.h2
          className="mb-3 text-2xl px-6 md:text-3xl font-semibold tracking-tight text-white"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: "tween", duration: 0.5, ease: EASE_IO }}
        >
          Открытые инструменты
        </motion.h2>

        <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Подзаголовок/дескриптор справа можно оставить, но на мобиле прячем, чтобы не ломать сетку */}
        <p className="hidden md:block px-6 -mt-6 mb-6 text-sm text-white/70">
          Доступны без регистрации. Работают прямо в браузере.
        </p>

        {/* Мобайл: карусель */}
        <div className="md:hidden">
          <HorizontalCarousel
            items={publicTools.map((t) => (
              <CardShell key={t.title}>
                <IconBadge><t.icon className="h-5 w-5 text-white" /></IconBadge>
                <CardTitle className="text-xl text-white">{t.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-white/75">
                  {t.text}
                </CardDescription>
                <CardContent className="px-0 pb-0">
                  <Button asChild className={btn.linkPill} variant="ghost">
                    <Link href={t.link}>Открыть</Link>
                  </Button>
                </CardContent>
              </CardShell>
            ))}
            cardWidth="min(80vw, 360px)"
            gapPx={16}
            showArrows={false}
            edgeGutterPx={24}     // px-6
            firstItemOffsetPx={16}
            ariaLabel="Карусель инструментов"
          />
        </div>

        {/* Десктоп/таблет: сетка */}
        <motion.div
          className="hidden md:grid gap-6 md:grid-cols-2 lg:grid-cols-4 px-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.45 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {publicTools.map((t) => (
            <motion.div
              key={t.title}
              variants={{
                hidden: { opacity: 0, y: 14 },
                show:   { opacity: 1, y: 0, transition: { type: "tween", duration: 0.5, ease: EASE_IO } },
              }}
            >
              <CardShell>
                <IconBadge><t.icon className="h-5 w-5 text-white" /></IconBadge>
                <CardTitle className="text-xl text-white">{t.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-white/75">
                  {t.text}
                </CardDescription>
                <CardContent className="px-0 pb-0">
                  <Button asChild className={btn.linkPill} variant="ghost">
                    <Link href={t.link}>Открыть</Link>
                  </Button>
                </CardContent>
              </CardShell>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>
    </section>
  );
}
