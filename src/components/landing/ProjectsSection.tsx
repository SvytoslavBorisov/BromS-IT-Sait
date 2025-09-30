// components/ProjectsSection.tsx
"use client";

/**
 * Лёгкая секция «Проекты», разбитая на подкомпоненты:
 *  — ProjectsBackground (фон сетка+фейд)
 *  — ProjectsCarouselCard (карточка с каруселью)
 *  — ProjectsChips (чипсы)
 *  — ProjectsActions (кнопки)
 */

import React, { useEffect, useState } from "react";
import ProjectsBackground from "@/components/landing/projects/ProjectsBackground";
import ProjectsCarouselCard from "@/components/landing/projects/ProjectsCarouselCard";
import ProjectsChips from "@/components/landing/projects/ProjectsChips";
import ProjectsActions from "@/components/landing/projects/ProjectsActions";

const CHIPS = ["Веб", "Мобайл", "Интеграции", "CRM/ERP", "Security", "Демо-страницы"] as const;

export default function ProjectsSection() {
  const [isMobile, setIsMobile] = useState(false);
  const [sections, setSections] = useState<string[]>([]);

  // Определяем мобильную ширину для выбора html-шаблонов карусели
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  // Загружаем HTML-секции карусели (без анимаций)
  useEffect(() => {
    const ctrl = new AbortController();
    const base = ["first", "second"];
    const urls = base.map(
      (name) => `/projects/${name}_${isMobile ? "mobile" : "desktop"}.html`
    );
    (async () => {
      try {
        const texts = await Promise.all(
          urls.map(async (u) => {
            const res = await fetch(u, { signal: ctrl.signal, cache: "force-cache" });
            if (!res.ok) throw new Error(`Не удалось загрузить ${u}`);
            return res.text();
          })
        );
        setSections(texts);
      } catch (e) {
        if ((e as any)?.name !== "AbortError") console.error(e);
      }
    })();
    return () => ctrl.abort();
  }, [isMobile]);

  return (
    <section
      id="portfolio"
      className="relative bg-white text-neutral-900 scroll-mt-28"
      aria-label="Наши проекты"
      style={{ contain: "layout paint" }}
    >
      {/* фон секции */}
      <ProjectsBackground />
      <div className="grid items-start gap-12 md:grid-cols-[minmax(0,3.6fr)_minmax(0,2fr)]">
        {/* Правая колонка: заголовок/описание/стек/кнопки */}
        <aside className="order-1 md:order-2 relative px-4 md:px-0 pt-16">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight pb-5 ">
            Наши проекты
          </h2>

          <p className="text-[15px] text-neutral-600 leading-relaxed">
            Подборка реальных кейсов, демо и объектов из нашего стека. Аккуратный UI,
            поддерживаемый код и прозрачные сроки.
          </p>

          <ProjectsChips items={CHIPS} />
          <ProjectsActions />
        </aside>

        {/* Левая колонка: карусель */}
        <div className="order-2 md:order-1 h-[clamp(520px,80svh,700px)]">
          <ProjectsCarouselCard sections={sections} />
        </div>
      </div>
    </section>
  );
}
