// components/ContactSection.tsx
"use client";

/**
 * Лёгкая версия секции "Контакты", разбитая на подкомпоненты:
 *  — ContactBackground (фон)
 *  — ContactChips (темы)
 *  — ContactActions (кнопки)
 *  — ContactCard (форма)
 */

import React from "react";
import ContactBackground from "@/components/landing/contact/ContactBackground";
import ContactChips from "@/components/landing/contact/ContactChips";
import ContactActions from "@/components/landing/contact/ContactActions";
import ContactCard from "@/components/landing/contact/ContactCard";

const CHIPS = [
  "Next.js",
  "React",
  "Интеграции",
  "Безопасность",
  "Поддержка",
] as const;

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="relative bg-white text-neutral-900 scroll-mt-28"
      style={{ contain: "layout paint" }}
      aria-labelledby="contact-heading"
    >
      {/* Фон */}
      <ContactBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24">
        <div className="grid gap-10 md:gap-16 md:grid-cols-2 items-start">
          {/* Левая колонка */}
          <div>
            <h2
              id="contact-heading"
              className="text-4xl md:text-5xl font-semibold tracking-tight"
            >
              Свяжитесь с нами
            </h2>

            <p className="mt-4 text-neutral-600 leading-relaxed">
              Опишите задачу — вернёмся с вариантами решения и оценкой сроков.
              Минимум формальностей, максимум пользы.
            </p>

            <ContactChips items={CHIPS} />
            <ContactActions />

            <div className="mt-5 text-xs text-neutral-500">
              Обычно отвечаем в течение{" "}
              <span className="font-medium text-neutral-700">1–2 часов</span> в
              будни.
            </div>
          </div>

          {/* Правая колонка */}
          <ContactCard />
        </div>
      </div>
    </section>
  );
}
