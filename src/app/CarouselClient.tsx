"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  sections: string[];       // HTML слайдов
  basePath?: string;        // базовый путь для относительных ссылок (по умолчанию /projects/)
}

/** Ребейз относительных ссылок (src/href/poster/srcset) в /projects/... */
function rebaseRelativeUrls(html: string, base = "/projects/") {
  const common = html.replace(
    /(src|href|poster)=["'](?!https?:|\/|data:|#)([^"']+)["']/gi,
    (_m, attr, url) => `${attr}="${base}${url.replace(/^\.?\//, "")}"`
  );
  return common.replace(
    /(srcset)=["']([^"']+)["']/gi,
    (_m, attr, value) => {
      const items = value.split(",").map(part => {
        const [u, d] = part.trim().split(/\s+/);
        if (/^(https?:|\/|data:|#)/.test(u)) return part.trim();
        const abs = `${base}${u.replace(/^\.?\//, "")}`;
        return d ? `${abs} ${d}` : abs;
      });
      return `${attr}="${items.join(", ")}"`;
    }
  );
}

export default function CarouselClient({ sections, basePath = "/projects/" }: Props) {
  const total = sections.length;
  const [current, setCurrent] = useState(0);

  const slides = useMemo(
    () => sections.map((s) => rebaseRelativeUrls(s, basePath)),
    [sections, basePath]
  );

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);
  const goTo = (i: number) => setCurrent(i);

  // Клавиши ← →
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Свайп
  const startX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => (startX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 40) (dx > 0 ? prev() : next());
  };

  if (total === 0) {
    return (
      <div className="relative w-full h-[360px] md:h-[520px] grid place-items-center">
        <span className="rounded-full bg-white/70 px-4 py-2 backdrop-blur ring-1 ring-black/10 text-neutral-700">
          Загрузка…
        </span>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Портфолио — карусель"
      className="relative w-full h-[clamp(640px,85svh,120px)]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* КЛИППЕР: именно он режет соседние слайды */}
      <div className="absolute inset-0 overflow-hidden rounded-none md:rounded-xl shadow-[0_40px_140px_-40px_rgba(0,0,0,0.25)]">
        {/* ТРЕК — двигаем transform-ом */}
        <div
          className="relative flex h-full w-full will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((html, idx) => (
            <div key={idx} className="relative w-full h-full flex-shrink-0">
              {/* Встроенный HTML — насильно растягиваем корни и картинки */}
              <div
                className="
                  absolute inset-0 w-full h-full
                  [&_section]:block [&_section]:w-full [&_section]:h-full
                  [&_div]:w-full
                  [&_img]:w-full [&_img]:h-full [&_img]:object-cover
                "
                dangerouslySetInnerHTML={{ __html: html }}
              />
              {/* Мягкие боковые шторки */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white/60 via-white/0 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white/60 via-white/0 to-transparent" />
            </div>
          ))}
        </div>
      </div>

      {/* Стрелки */}
      <button
        aria-label="Предыдущий"
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center
                   h-10 w-10 rounded-full bg-white/80 hover:bg-white transition
                   ring-1 ring-black/10 backdrop-blur shadow-sm"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" className="text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        aria-label="Следующий"
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center
                   h-10 w-10 rounded-full bg-white/80 hover:bg-white transition
                   ring-1 ring-black/10 backdrop-blur shadow-sm"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" className="text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Точки */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6">
        {slides.map((_, idx) => {
          const active = idx === current;
          return (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`Слайд ${idx + 1}`}
              className={`h-[10px] w-[10px] rounded-full ring-1 transition
                          ${active ? "bg-neutral-900 ring-black/20 scale-110" : "bg-neutral-300 ring-black/10 hover:bg-neutral-400"}`}
            />
          );
        })}
      </div>
    </div>
  );
}
