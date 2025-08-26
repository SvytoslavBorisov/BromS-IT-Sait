"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { btn } from "../ui/btnPresets";

export default function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-10">
        <div className="flex flex-col items-center text-center gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Image src="/icon.svg" alt="Broms IT" width={96} height={96} className="drop-shadow-sm" priority />
          </motion.div>

          <motion.h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}>
            Broms IT — криптографические сервисы
          </motion.h1>

          <motion.p className="max-w-2xl text-balance text-white/70"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            «Делаем сложную криптографию очень простой»: инструменты для хэширования, электронных подписей и порогового разделения секрета прямо в браузере.
          </motion.p>

          <motion.div className="flex flex-col sm:flex-row gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }}>
            <Button asChild className={btn.primary} size="lg">
              <Link href="#tools">Попробовать инструменты</Link>
            </Button>
            <Button asChild className={btn.secondary} size="lg" variant="outline">
              <Link href="#articles">Читать статьи</Link>
            </Button>
          </motion.div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-fuchsia-500/70 to-cyan-400/70" />
    </section>
  );
}
