// app/sections/CTA.tsx
"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { btn } from "../ui/btnPresets";
import { motion } from "framer-motion";

const EASE_IO = [0.4, 0.0, 0.2, 1] as const;

export default function CTA() {
  return (
    <section className="relative z-10" aria-label="CTA">
      <div className="mx-auto max-w-7xl py-12 md:py-16">
        {/* Заголовок как в Features */}
        <motion.h2
          className="mb-3 text-2xl px-6 md:text-3xl font-semibold tracking-tight text-white"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: "tween", duration: 0.5, ease: EASE_IO }}
        >
          Готовы начать?
        </motion.h2>

        <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Карточка CTA в общем глянцевом стиле */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ type: "tween", duration: 0.55, ease: EASE_IO }}
          className="px-6"
        >
          <div
            className="group relative rounded-[1.4rem] p-[1px]
                       bg-[conic-gradient(from_210deg,rgba(255,255,255,.18),rgba(255,255,255,.05),rgba(255,255,255,.18))]"
          >
            <Card
              className="overflow-hidden rounded-[1.3rem] border border-white/10
                         bg-[linear-gradient(180deg,rgba(0,0,0,.78),rgba(0,0,0,.52))]
                         shadow-[0_20px_80px_-30px_rgba(0,0,0,.8)] relative"
            >
              {/* внешний мягкий блик и тонкое кольцо как в Features */}
              <span className="pointer-events-none absolute inset-0 rounded-[1.3rem] ring-1 ring-inset ring-white/10" />
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[.06]"
                style={{
                  backgroundImage: "radial-gradient(rgba(255,255,255,.6) 1px, transparent 1px)",
                  backgroundSize: "18px 18px",
                }}
              />

              <div className="grid gap-6 p-6 md:grid-cols-[1.5fr,1fr] md:p-10">
                <div>
                  <h3 className="text-2xl md:text-3xl font-semibold text-white">
                    Нужен корпоративный сценарий?
                  </h3>
                  <p className="mt-2 text-white/75 leading-relaxed">
                    Интегрируем криптографию в ваши процессы: электронный документооборот,
                    подписи и пороговое хранение секретов.
                  </p>
                </div>

                <div className="flex items-center md:justify-end">
                  <Button size="lg" asChild className={btn.primary}>
                    <Link href="/contact">Связаться</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

        <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>
    </section>
  );
}
