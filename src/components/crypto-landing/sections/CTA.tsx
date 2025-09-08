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
    <section className="relative">
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.99 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ type: "tween", duration: 0.55, ease: EASE_IO }}
          className="group relative rounded-3xl p-[1px]
                     bg-[conic-gradient(from_140deg,rgba(255,255,255,.18),rgba(255,255,255,.05),rgba(255,255,255,.18))]"
        >
          <Card className="overflow-hidden rounded-[1.4rem] bg-white/5 border-white/10 backdrop-blur">
            <span className="pointer-events-none absolute inset-0 rounded-[1.4rem] bg-gradient-to-br from-white/10 to-transparent" />
            <div className="grid gap-6 p-6 md:grid-cols-[1.5fr,1fr] md:p-10">
              <div>
                <h3 className="text-2xl md:text-3xl font-semibold">Нужен корпоративный сценарий?</h3>
                <p className="mt-2 text-white/70">
                  Интегрируем криптографию в ваши процессы: электронный документооборот, подписи и пороговое хранение секретов.
                </p>
              </div>
              <div className="flex items-center md:justify-end">
                <Button size="lg" asChild className={btn.primary}>
                  <Link href="/contact">Связаться</Link>
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
