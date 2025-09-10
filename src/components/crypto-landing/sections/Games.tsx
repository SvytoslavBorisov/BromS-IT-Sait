// app/sections/Games.tsx
"use client";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { btn } from "../ui/btnPresets";
import { gamesList } from "../data/landingData";
import { motion } from "framer-motion";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";
import { CardShell, IconBadge } from "@/components/ui/CardShell";

const EASE_IO = [0.4, 0.0, 0.2, 1] as const;

export default function Games() {
  return (
    <section id="games" className="relative z-10" aria-label="Игры">
      <div className="mx-auto max-w-7xl pt-14 md:pt-18">
        {/* Заголовок в стиле Features */}
        <motion.h2
          className="mb-3 text-2xl px-6 md:text-3xl font-semibold tracking-tight text-white"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: "tween", duration: 0.5, ease: EASE_IO }}
        >
          Игры
        </motion.h2>

        <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <p className="hidden md:block px-6 -mt-6 mb-6 text-sm text-white/70">
          Все игры доступны прямо в браузере.
        </p>

        {/* Мобайл: карусель без стрелок + отступ первой карточке */}
        <div className="md:hidden">
          <HorizontalCarousel
            items={gamesList.map((g) => (
              <CardShell key={g.title}>
                <IconBadge><Gamepad2 className="h-5 w-5 text-white" /></IconBadge>
                <CardTitle className="text-xl text-white">{g.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-white/75">
                  {g.desc}
                </CardDescription>
                <CardContent className="px-0 pb-0">
                  <Button asChild className={btn.linkPill} variant="ghost">
                    <Link href={g.link}>Играть</Link>
                  </Button>
                </CardContent>
              </CardShell>
            ))}
            cardWidth="min(80vw, 360px)"
            gapPx={16}
            showArrows={false}
            edgeGutterPx={24}     // px-6
            firstItemOffsetPx={16}
            ariaLabel="Карусель игр"
          />
        </div>

        {/* Десктоп/таблет: сетка */}
        <motion.div
          className="hidden md:grid gap-6 md:grid-cols-3 px-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.45 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {gamesList.map((g) => (
            <motion.div
              key={g.title}
              variants={{
                hidden: { opacity: 0, y: 14 },
                show:   { opacity: 1, y: 0, transition: { type: "tween", duration: 0.5, ease: EASE_IO } },
              }}
            >
              <CardShell>
                <IconBadge><Gamepad2 className="h-5 w-5 text-white" /></IconBadge>
                <CardTitle className="text-xl text-white">{g.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-white/75">
                  {g.desc}
                </CardDescription>
                <CardContent className="px-0 pb-0">
                  <Button asChild className={btn.linkPill} variant="ghost">
                    <Link href={g.link}>Играть</Link>
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
