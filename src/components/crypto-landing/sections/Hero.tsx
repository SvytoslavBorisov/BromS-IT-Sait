// components/Hero.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { btn } from "../ui/btnPresets";

const EASE = [0.4, 0.0, 0.2, 1] as const;

export default function Hero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-black text-white">
      {/* ===== BACKGROUND (всегда ПОЗАДИ) ===== */}
      <div className="pointer-events-none absolute inset-0 z-0"> 
        {/* базовый «кино»-градиент */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,#0f0f0f_0%,#000_60%)]" />

        {/* звёзды: медленный дрейф */}
        <motion.div
          className="absolute inset-[-40%] opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.65) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            filter: "drop-shadow(0 0 2px rgba(255,255,255,.28))",
          }}
          animate={{ x: [0, -160, 0], y: [0, -120, 0] }}
          transition={{ duration: 75, ease: "linear", repeat: Infinity }}
        />

        {/* блики: мягкий дрейф */}
        <motion.div
          className="absolute left-[10vmin] top-[12vmin] rounded-full blur-3xl mix-blend-screen"
          style={{
            width: "70vmin",
            height: "70vmin",
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18), rgba(255,255,255,0.0) 60%)",
          }}
          animate={{ x: [-20, 10, -20], y: [0, 20, 0] }}
          transition={{ duration: 40, ease: "easeInOut", repeat: Infinity }}
        />
        <motion.div
          className="absolute right-[-10vmin] bottom-[-10vmin] rounded-full blur-3xl mix-blend-screen"
          style={{
            width: "80vmin",
            height: "80vmin",
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.13), rgba(255,255,255,0.0) 60%)",
          }}
          animate={{ x: [10, -15, 10], y: [-10, 10, -10] }}
          transition={{ duration: 52, ease: "easeInOut", repeat: Infinity }}
        />

        {/* орбиты: противоположное вращение */}
        <motion.svg
          className="absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 opacity-60"
          viewBox="0 0 100 100"
          animate={{ rotate: 360 }}
          transition={{ duration: 80, ease: "linear", repeat: Infinity }}
        >
          <defs>
            <linearGradient id="orb1" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.0)" />
              <stop offset="40%" stopColor="rgba(255,255,255,0.28)" />
              <stop offset="75%" stopColor="rgba(255,255,255,0.0)" />
            </linearGradient>
          </defs>
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="url(#orb1)"
            strokeWidth="0.45"
            strokeDasharray="140 520"
            strokeLinecap="round"
          />
        </motion.svg>

        <motion.svg
          className="absolute left-1/2 top-1/2 h-[92vmin] w-[92vmin] -translate-x-1/2 -translate-y-1/2 opacity-45"
          viewBox="0 0 100 100"
          animate={{ rotate: -360 }}
          transition={{ duration: 95, ease: "linear", repeat: Infinity }}
        >
          <defs>
            <linearGradient id="orb2" x1="1" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.0)" />
              <stop offset="35%" stopColor="rgba(255,255,255,0.22)" />
              <stop offset="80%" stopColor="rgba(255,255,255,0.0)" />
            </linearGradient>
          </defs>
          <circle
            cx="50" cy="50" r="32"
            fill="none"
            stroke="url(#orb2)"
            strokeWidth="0.4"
            strokeDasharray="110 420"
            strokeLinecap="round"
          />
        </motion.svg>

        {/* виньетка + hairline */}
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_30%,transparent,rgba(0,0,0,.6))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>

      {/* ===== CONTENT (всегда ВПЕРЕДИ) ===== */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl flex-col items-center justify-center gap-6 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "tween", duration: 0.5, ease: EASE }}
        >
          <Image
            src="/icon.svg"
            alt="Broms IT"
            width={96}
            height={96}
            className="drop-shadow-[0_8px_40px_rgba(255,255,255,.25)]"
            priority
          />
        </motion.div>

        <motion.h1
          className="text-balance text-4xl font-extrabold tracking-tight md:text-6xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "tween", duration: 0.55, ease: EASE, delay: 0.05 }}
        >
          Broms IT — криптографические сервисы
        </motion.h1>

        <motion.p
          className="max-w-2xl text-pretty leading-relaxed text-white/70"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "tween", duration: 0.6, ease: EASE, delay: 0.1 }}
        >
          «Делаем сложную криптографию очень простой»: инструменты для хэширования,
          электронных подписей и порогового разделения секрета прямо в браузере.
        </motion.p>

        <motion.div
          className="mt-2 flex flex-col gap-3 sm:flex-row"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "tween", duration: 0.5, ease: EASE, delay: 0.15 }}
        >
          <Button asChild className={btn.primary} size="lg">
            <Link href="#tools">Попробовать инструменты</Link>
          </Button>
          <Button asChild className={btn.secondary} size="lg" variant="outline">
            <Link href="#articles">Читать статьи</Link>
          </Button>
        </motion.div>
      </div>

      {/* ===== ARROW DOWN (самый верхний слой) ===== */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-6">
        <motion.div
          className="pointer-events-auto"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.4 }}
        >
          <Link
            href="#tools"
            aria-label="Прокрутить вниз к инструментам"
            className="group inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur transition hover:bg-white/10"
          >
            <motion.svg
              width="22" height="22" viewBox="0 0 24 24" fill="none"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="opacity-80 transition group-hover:opacity-100"
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
