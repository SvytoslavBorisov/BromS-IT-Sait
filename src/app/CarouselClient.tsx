"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

/** ====== Типы пропсов (readonly) ====== */
interface Props {
  readonly sections: readonly string[]; // массив HTML-слайдов
  readonly basePath?: string;           // базовый путь для относительных ссылок (по умолчанию /projects/)
}

/** Быстрый стабильный хэш (djb2) для ключей — лучше индекса массива */
function stableHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  // превращаем в положительный и шорт-хекс
  return (h >>> 0).toString(16);
}

/** Ребейз относительных ссылок + форсируем ленивую загрузку изображений */
function rebaseRelativeUrls(html: string, base = "/projects/") {
  // src/href/poster -> абсолютные
  const common = html.replace(
    /(src|href|poster)=["'](?!https?:|\/|data:|#)([^"']+)["']/gi,
    (_m, attr, url) => `${attr}="${base}${url.replace(/^\.?\//, "")}"`
  );

  // srcset -> абсолютные
  const withSrcset = common.replace(
    /(srcset)=["']([^"']+)["']/gi,
    (_m, attr, value) => {
      const items = value.split(",").map((part) => {
        const [u, d] = part.trim().split(/\s+/);
        if (/^(https?:|\/|data:|#)/.test(u)) return part.trim();
        const abs = `${base}${u.replace(/^\.?\//, "")}`;
        return d ? `${abs} ${d}` : abs;
      });
      return `${attr}="${items.join(", ")}"`;
    }
  );

  // Принудительно лёгкая загрузка для <img ...>
  // добавим loading="lazy" decoding="async" если их нет
  const withImgPerf = withSrcset.replace(
    /<img\b([^>]*)>/gi,
    (m, attrs) => {
      const hasLoading = /\bloading=/.test(attrs);
      const hasDecoding = /\bdecoding=/.test(attrs);
      const hasFetchPriority = /\bfetchpriority=/.test(attrs);

      const extra =
        (hasLoading ? "" : ' loading="lazy"') +
        (hasDecoding ? "" : ' decoding="async"') +
        (hasFetchPriority ? "" : ' fetchpriority="low"');

      return `<img${attrs}${extra}>`;
    }
  );

  return withImgPerf;
}

/** Хук: матчим мобильный брейкпоинт (<= 640px) */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return isMobile;
}

/** Главный компонент */
export default function CarouselClient({ sections, basePath = "/projects/" }: Props) {
  const total = sections.length;
  const [current, setCurrent] = useState(0);
  const isMobile = useIsMobile();

  /** Готовим HTML с ребейзом ссылок и прокачкой img */
  const slides = useMemo(
    () => sections.map((s) => rebaseRelativeUrls(s, basePath)),
    [sections, basePath]
  );

  /** Стабильные ключи по содержимому */
  const keys = useMemo(() => slides.map((s) => stableHash(s)), [slides]);

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);
  const goTo = (i: number) => setCurrent(i);

  // Клавиши ← →
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey, { passive: true } as any);
    return () => window.removeEventListener("keydown", onKey as any);
  }, [total]);

  // Свайпы (passive handlers-friendly)
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

  /** ====== Мобильный режим: супер-лёгкий ======
   * - Монтируем только текущий слайд (без соседей) — минимальный DOM
   * - Без теней/градиентов
   * - Плавная, но очень лёгкая анимация (opacity/transform, короткая)
   */
  if (isMobile) {
    const html = slides[current];
    const k = keys[current];
    return (
      <section
        aria-label="Портфолио — карусель"
        className="relative w-full h-[min(72svh,520px)]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          key={k}
          // простая лёгкая анимация появления
          className="absolute inset-0 transition-opacity duration-250 ease-out will-change-opacity"
          style={{ opacity: 1 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {/* Стрелки — компактные, без теней */}
        <button
          aria-label="Предыдущий"
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 grid place-items-center
                     h-9 w-9 rounded-full bg-white/85 hover:bg-white transition ring-1 ring-black/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          aria-label="Следующий"
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 grid place-items-center
                     h-9 w-9 rounded-full bg-white/85 hover:bg-white transition ring-1 ring-black/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Точки — минимальные */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
          {slides.map((_s, idx) => {
            const active = idx === current;
            return (
              <button
                key={keys[idx]}
                onClick={() => goTo(idx)}
                aria-label={`Слайд ${idx + 1}`}
                aria-current={active ? "true" : undefined}
                className={`h-2 w-2 rounded-full transition
                            ${active ? "bg-neutral-900" : "bg-neutral-300 hover:bg-neutral-400"}`}
              />
            );
          })}
        </div>
      </section>
    );
  }

  /** ====== Десктоп/планшет: трек с transform и мягкими шторками ====== */
  return (
    <section
      aria-label="Портфолио — карусель"
      className="relative w-full h-[clamp(420px,70svh,720px)]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Клиппер */}
      <div className="absolute inset-0 overflow-hidden rounded-none md:rounded-xl shadow-[0_40px_140px_-40px_rgba(0,0,0,0.25)]">
        {/* Трек */}
        <div
          className="relative flex h-full w-full will-change-transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((html, idx) => (
            <div key={keys[idx]} className="relative w-full h-full flex-shrink-0">
              {/* Встроенный HTML — растягиваем корни и картинки */}
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
        {slides.map((_s, idx) => {
          const active = idx === current;
          return (
            <button
              key={keys[idx]}
              onClick={() => goTo(idx)}
              aria-label={`Слайд ${idx + 1}`}
              aria-current={active ? "true" : undefined}
              className={`h-[10px] w-[10px] rounded-full ring-1 transition
                          ${active ? "bg-neutral-900 ring-black/20 scale-110" : "bg-neutral-300 ring-black/10 hover:bg-neutral-400"}`}
            />
          );
        })}
      </div>
    </section>
  );
}
