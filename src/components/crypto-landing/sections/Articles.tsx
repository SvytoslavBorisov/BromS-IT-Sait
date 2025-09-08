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

const EASE_IO = [0.4, 0.0, 0.2, 1] as const;

export default function Articles() {
  return (
    <section id="articles" className="relative">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="mb-6 flex items-center justify-between gap-4">
          <motion.h2
            className="text-2xl md:text-3xl font-semibold tracking-tight"
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

        <motion.div
          className="grid gap-6 md:grid-cols-3"
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
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full bg-white/10 text-white border border-white/15">
                        {a.tag}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl leading-snug">
                      <Link href={a.link} className="transition-colors hover:text-white/90">
                        {a.title}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-white/70">
                      {a.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className={btn.linkPill} variant="ghost">
                      <Link href={a.link}>
                        Читать <ArrowRight className="h-4 w-4" />
                      </Link>
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
