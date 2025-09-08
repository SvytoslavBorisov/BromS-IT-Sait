// app/sections/Tools.tsx
"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { btn } from "../ui/btnPresets";
import { publicTools } from "../data/landingData";
import { motion } from "framer-motion";

const EASE_IO = [0.4, 0.0, 0.2, 1] as const;

export default function Tools() {
  return (
    <section id="tools" className="relative">
      <div className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <motion.h2
            className="text-2xl md:text-3xl font-semibold tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ type: "tween", duration: 0.5, ease: EASE_IO }}
          >
            Открытые инструменты
          </motion.h2>
          <p className="text-sm text-white/70">Доступны без регистрации. Работают прямо в браузере.</p>
        </div>

        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
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
              <div className="group relative rounded-2xl p-[1px]
                              bg-[conic-gradient(from_140deg,rgba(255,255,255,.15),rgba(255,255,255,.04),rgba(255,255,255,.15))]">
                <Card className="h-full rounded-[1rem] bg-white/5 border-white/10 backdrop-blur relative overflow-hidden">
                  <span className="pointer-events-none absolute inset-0 rounded-[1rem] bg-gradient-to-br from-white/10 to-transparent" />
                  <span className="pointer-events-none absolute -inset-1 bg-gradient-to-r from-transparent via-white/10 to-transparent
                                   rotate-6 translate-x-[-120%] group-hover:translate-x-[120%]
                                   transition-transform duration-[1200ms] ease-[cubic-bezier(.4,0,.2,1)]" />
                  <CardHeader className="relative space-y-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl
                                    bg-white/10 ring-1 ring-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]
                                    group-hover:shadow-[0_8px_30px_-8px_rgba(56,189,248,.55)]
                                    transition-shadow duration-300">
                      <t.icon className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-lg">{t.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-white/70">
                      {t.text}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className={btn.linkPill} variant="ghost">
                      <Link href={t.link}>Открыть</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
