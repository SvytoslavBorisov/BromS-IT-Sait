"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Shield, Lock, KeyRound, ScrollText, Wrench, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: Shield, title: "Безопасность по умолчанию", text: "Проектируем сервисы с защитой данных и приватностью на первом месте." },
  { icon: Lock, title: "ГОСТ и международные стандарты", text: "Поддержка алгоритмов Стрибог, ГОСТ Р 34.10-2012, а также современных стандартов." },
  { icon: KeyRound, title: "Пороговые схемы", text: "Секрет‑шеринг, верифицируемое распределение долей и восстановление без ЦДУ." },
];

const articlePlaceholders = [
  { tag: "Криптография", title: "Введение в пороговые схемы (Shamir, Feldman VSS)", excerpt: "Теория и практические нюансы в веб‑сервисах.", link: "/crypto/blog/shamir-threshold" },
  { tag: "ГОСТ", title: "Стрибог‑256 на практике", excerpt: "Интеграция, ошибки имплементации и тест‑вектора.", link: "/crypto/blog/shamir-threshold" },
  { tag: "PKI", title: "CMS/CAdES‑BES в веб‑приложении", excerpt: "Форматы, идентификаторы подписанта и совместимость.", link: "/crypto/blog/shamir-threshold" },
];

const publicTools = [
  { icon: Wrench,    title: "Хэш‑утилита",       text: "Проверка/генерация хэшей (Стрибог‑256, SHA‑2/3)", link: "/crypto/random" },
  { icon: KeyRound,  title: "Генерация ключей",  text: "Демо‑генерация пар ключей (локально, без сервера)", link: "/crypto/random" },
  { icon: ScrollText,title: "Проверка подписи",  text: "Проверить подпись файла/строки в браузере", link: "/crypto/random" },
  { icon: Globe,     title: "Случайность",       text: "Калькулятор энтропии и генератор случайных строк", link: "/crypto/random" },
];

/** Красивые пресеты кнопок под тёмный фон */
const btn = {
  primary:
    // Премиальный градиент + мягкое свечение
    "relative rounded-2xl px-5 md:px-6 py-3 md:py-3.5 font-semibold text-white " +
    "bg-gradient-to-r from-primary via-fuchsia-500 to-cyan-400 " +
    "shadow-[0_8px_30px_rgba(59,130,246,0.35)] ring-1 ring-white/10 " +
    "hover:brightness-[1.08] hover:shadow-[0_10px_40px_rgba(59,130,246,0.45)] " +
    "active:translate-y-[1px] transition will-change-transform",
  secondary:
    // Стеклянная светлая обводка
    "rounded-2xl px-5 md:px-6 py-3 md:py-3.5 font-semibold " +
    "bg-white/10 text-white border border-white/20 " +
    "backdrop-blur-sm hover:bg-white/14 hover:border-white/30 " +
    "active:translate-y-[1px] transition",
  linkPill:
    // Для «Читать», «Открыть», «Все статьи»
    "rounded-full px-3.5 py-2 text-sm font-medium " +
    "bg-white/8 text-white hover:bg-white/12 border border-white/15 " +
    "inline-flex items-center gap-1.5 transition",
  linkGhostDark:
    // Лёгкий линк без «провала» в чёрное
    "rounded-full px-2.5 py-2 text-sm font-medium text-white/90 hover:text-white " +
    "hover:bg-white/10 transition inline-flex items-center gap-1.5",
};

export default function CryptoLandingClient() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-10">
          <div className="flex flex-col items-center text-center gap-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Image src="/icon.svg" alt="Broms IT" width={96} height={96} className="drop-shadow-sm" priority />
            </motion.div>

            <motion.h1
              className="text-4xl md:text-5xl font-bold tracking-tight text-white"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
            >
              Broms IT — криптографические сервисы
            </motion.h1>

            <motion.p
              className="max-w-2xl text-balance text-white/70"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              «Делаем сложную криптографию очень простой»: инструменты для хэширования, электронных подписей и
              порогового разделения секрета прямо в браузере.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
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

      {/* WHAT WE DO */}
      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <div key={f.title} className="animate-in fade-in slide-in-from-bottom-1 duration-300" style={{ animationDelay: `${i * 60}ms` }}>
              <Card className="h-full bg-white/5 border-white/10">
                <CardHeader className="space-y-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                    <f.icon className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-xl text-white">{f.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed text-white/70">{f.text}</CardDescription>
                </CardHeader>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* ARTICLES */}
      <section id="articles" className="mx-auto max-w-6xl px-6 py-6 md:py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Статьи</h2>
          <Button asChild className={btn.linkGhostDark} variant="ghost">
            <Link href="/crypto/blog">
              Все статьи <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {articlePlaceholders.map((a, i) => (
            <Card key={i} className="group h-full overflow-hidden bg-white/5 border-white/10">
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full bg-white/10 text-white border border-white/15">
                    {a.tag}
                  </Badge>
                </div>
                <CardTitle className="text-xl leading-snug text-white">
                  <Link href="#" className="transition-colors group-hover:text-white/90">
                    {a.title}
                  </Link>
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed text-white/70">{a.excerpt}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className={btn.linkPill} variant="ghost">
                  <Link href={a.link}>
                    Читать <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PUBLIC TOOLS */}
      <section id="tools" className="z-100 mx-auto max-w-6xl px-6 py-6 md:py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Открытые инструменты</h2>
          <p className="text-sm text-white/70">Доступны без регистрации. Работают прямо в браузере.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {publicTools.map((t, i) => (
            <Card key={i} className="h-full bg-white/5 border-white/10">
              <CardHeader className="space-y-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <t.icon className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg text-white">{t.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-white/70">{t.text}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className={btn.linkPill} variant="ghost">
                  <Link href={t.link}>Открыть</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-2">
        <Card className="overflow-hidden border-dashed bg-white/5 border-white/15">
          <div className="grid gap-6 p-6 md:grid-cols-[1.5fr,1fr] md:p-10">
            <div>
              <h3 className="text-2xl md:text-3xl font-semibold text-white">Нужен корпоративный сценарий?</h3>
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
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-white/60">
          © {new Date().getFullYear()} Broms IT. Криптография с заботой о приватности.
        </div>
      </footer>
    </div>
  );
}
