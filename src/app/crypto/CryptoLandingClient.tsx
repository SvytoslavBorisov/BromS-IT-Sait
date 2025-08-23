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
  { tag: "Криптография", title: "Введение в пороговые схемы (Shamir, Feldman VSS)", excerpt: "Теория и практические нюансы в веб‑сервисах." },
  { tag: "ГОСТ", title: "Стрибог‑256 на практике", excerpt: "Интеграция, ошибки имплементации и тест‑вектора." },
  { tag: "PKI", title: "CMS/CAdES‑BES в веб‑приложении", excerpt: "Форматы, идентификаторы подписанта и совместимость." },
];

const publicTools = [
  { icon: Wrench,    title: "Хэш‑утилита",       text: "Проверка/генерация хэшей (Стрибог‑256, SHA‑2/3)" },
  { icon: KeyRound,  title: "Генерация ключей",  text: "Демо‑генерация пар ключей (локально, без сервера)" },
  { icon: ScrollText,title: "Проверка подписи",  text: "Проверить подпись файла/строки в браузере" },
  { icon: Globe,     title: "Случайность",       text: "Калькулятор энтропии и генератор случайных строк" },
];

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

            <motion.h1 className="text-4xl md:text-5xl font-bold tracking-tight"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.05 }}>
              Broms IT — криптографические сервисы
            </motion.h1>

            <motion.p className="max-w-2xl text-balance text-muted-foreground"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
              «Делаем сложную криптографию простой»: инструменты для хэширования, электронных подписей и
              порогового разделения секрета прямо в браузере.
            </motion.p>

            <motion.div className="flex gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.15 }}>
              <Button asChild size="lg"><Link href="#tools">Попробовать инструменты</Link></Button>
              <Button asChild variant="outline" size="lg"><Link href="#articles">Читать статьи</Link></Button>
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
              <Card className="h-full">
                <CardHeader className="space-y-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{f.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{f.text}</CardDescription>
                </CardHeader>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* ARTICLES */}
      <section id="articles" className="mx-auto max-w-6xl px-6 py-6 md:py-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Статьи</h2>
          <Button variant="ghost" asChild><Link href="/blog">Все статьи <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {articlePlaceholders.map((a, i) => (
            <Card key={i} className="group h-full overflow-hidden">
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">{a.tag}</Badge>
                </div>
                <CardTitle className="text-xl leading-snug">
                  <Link href="#" className="transition-colors group-hover:text-primary">{a.title}</Link>
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">{a.excerpt}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="px-0" asChild><Link href="#">Читать <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PUBLIC TOOLS */}
      <section id="tools" className="mx-auto max-w-6xl px-6 py-6 md:py-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Открытые инструменты</h2>
          <p className="text-sm text-muted-foreground">Доступны без регистрации. Работают прямо в браузере.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {publicTools.map((t, i) => (
            <Card key={i} className="h-full">
              <CardHeader className="space-y-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <t.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{t.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">{t.text}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild><Link href="#">Открыть</Link></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-2">
        <Card className="overflow-hidden border-dashed">
          <div className="grid gap-6 p-6 md:grid-cols-[1.5fr,1fr] md:p-10">
            <div>
              <h3 className="text-2xl md:text-3xl font-semibold">Нужен корпоративный сценарий?</h3>
              <p className="mt-2 text-muted-foreground">
                Интегрируем криптографию в ваши процессы: электронный документооборот, подписи и пороговое хранение секретов.
              </p>
            </div>
            <div className="flex items-center md:justify-end">
              <Button size="lg" asChild><Link href="/contact">Связаться</Link></Button>
            </div>
          </div>
        </Card>
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Broms IT. Криптография с заботой о приватности.
        </div>
      </footer>
    </div>
  );
}
