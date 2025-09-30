// components/AboutSection.tsx
"use client";

/**
 * Лёгкая секция "О нас", разбитая на подкомпоненты:
 *  — AboutBackground (фон сетка+фейд)
 *  — AboutChips (технологический стек)
 *  — AboutCard (список шагов и статистика)
 */

import React from "react";
import AboutBackground from "@/components/landing/about/AboutBackground";
import AboutChips from "@/components/landing/about/AboutChips";
import AboutCard from "@/components/landing/about/AboutCard";

const CHIPS = [
  "Next.js",
  "React",
  "Node.js",
  "iOS/Android",
  "CRM/ERP",
  "Security",
] as const;

export default function AboutSection() {
  return (
    <section
      id="about"
      className="relative isolate overflow-hidden text-neutral-900 scroll-mt-28"
      style={{ contain: "layout paint" }}
      aria-labelledby="about-heading"
    >
      <AboutBackground />

      <div className="mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24 relative z-10">
        <div className="grid items-start gap-10 md:gap-16 md:grid-cols-2">
          {/* Левая колонка */}
          <div>
            <h2
              id="about-heading"
              className="text-4xl md:text-5xl font-semibold tracking-tight"
            >
              О нас
            </h2>

            <p className="mt-4 text-neutral-600 leading-relaxed [text-wrap:balance]">
              «БромС» — команда, которая делает чистые интерфейсы, чистый код и
              чистые IT-решения: от веба и мобильных приложений до интеграций и
              безопасности. Работаем быстро, прозрачно, с фокусом на измеримый
              результат и долгую поддержку.
            </p>

            <p className="mt-3 text-neutral-600 leading-relaxed [text-wrap:balance]">
              Мы начинаем с цели и аудитории, затем проектируем маршруты,
              шлифуем UI/UX и закрываем бизнес-метрики. Всё — без лишнего
              визуального шума.
            </p>

            <AboutChips items={CHIPS} />
          </div>

          {/* Правая колонка */}
          <AboutCard />
        </div>
      </div>
    </section>
  );
}
