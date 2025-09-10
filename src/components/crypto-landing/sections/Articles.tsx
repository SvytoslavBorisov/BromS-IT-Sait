// app/sections/Articles.tsx
"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { btn } from "../ui/btnPresets";
import { articlePlaceholders } from "../data/landingData";
import { motion } from "framer-motion";
import HorizontalCarousel from "@/components/ui/HorizontalCarousel";

const EASE_IO = [0.4, 0.0, 0.2, 1] as const;

export default function Articles() {
  return (
    <section id="articles" className="relative z-10" aria-label="Статьи">
      <div className="mx-auto max-w-7xl pt-14 md:pt-18">
        {/* Заголовок в стиле Features */}
        <div className="mb-3 flex items-center justify-between gap-4 px-6">
          <motion.h2
            className="text-2xl md:text-3xl font-semibold tracking-tight text-white"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ type: "tween", duration: 0.5, ease: EASE_IO }}
          >
            Статьи
          </motion.h2>

          <Button asChild className={btn.linkGhostDark} variant="ghost">
            <Link href="/crypto/blog">
              Все статьи <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Мобайл: карусель без стрелок + «воздух» у первой карточки */}
        <div className="md:hidden">
          <HorizontalCarousel
            items={articlePlaceholders.map((a) => (
              <ArticleCard key={a.title} a={a} />
            ))}
            cardWidth="min(82vw, 380px)"
            gapPx={16}
            showArrows={false}
            edgeGutterPx={24}     // совпадает с px-6
            firstItemOffsetPx={16}
            ariaLabel="Лента статей"
          />
        </div>

        {/* Десктоп: сетка как в Features */}
        <motion.div
          className="hidden md:grid gap-6 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.45 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {articlePlaceholders.map((a) => (
            <motion.div
              key={a.title}
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: { type: "tween", duration: 0.5, ease: EASE_IO } },
              }}
            >
              <ArticleCard a={a} />
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>
    </section>
  );
}

/* ===== Карточка в стиле Features (тот же CardShell / IconBadge) ===== */

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

function ArticleCard({ a }: { a: (typeof articlePlaceholders)[number] }) {
  return (
    <CardShell>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="rounded-full bg-white/10 text-white border border-white/15">
          {a.tag}
        </Badge>
      </div>

      <CardTitle className="text-xl leading-snug text-white">
        <Link href={a.link} className="transition-colors hover:text-white/90">
          {a.title}
        </Link>
      </CardTitle>

      <CardDescription className="text-sm leading-relaxed text-white/75">
        {a.excerpt}
      </CardDescription>

      <CardContent className="px-0 pb-0">
        <Button asChild className={btn.linkPill} variant="ghost">
          <Link href={a.link}>
            Читать <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </CardShell>
  );
}
