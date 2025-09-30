"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

/** ====== Типы пропсов ====== */
interface Props {
  readonly sections: readonly string[]; // массив HTML-слайдов
  readonly basePath?: string;           // базовый путь для относительных ссылок (по умолчанию /projects/)
}

/** Быстрый стабильный хэш (djb2) для ключей — лучше индекса массива */
function stableHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(16);
}

/** Ребейз относительных ссылок + лёгкие атрибуты изображений */
function rebaseRelativeUrls(html: string, base = "/projects/") {
  const common = html.replace(
    /(src|href|poster)=["'](?!https?:|\/|data:|#)([^"']+)["']/gi,
    (_m, attr, url) => `${attr}="${base}${url.replace(/^\.?\//, "")}"`,
  );
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
    },
  );
  return withSrcset.replace(
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
    },
  );
}

/** Хук: мобильный брейкпоинт (<= 768px) */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return isMobile;
}

/** Хук: поддержка reduce motion */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  return reduced;
}

/** Главный компонент */
export default function CarouselClient({ sections, basePath = "/projects/" }: Props) {
  const total = sections.length;
  const isMobile = useIsMobile();
  const reduced = useReducedMotion();

  /** Готовим HTML с ребейзом ссылок и прокачкой img */
  const slides = useMemo(
    () => sections.map((s) => rebaseRelativeUrls(s, basePath)),
    [sections, basePath],
  );

  /** Стабильные ключи по содержимому */
  const keys = useMemo(() => slides.map((s) => stableHash(s)), [slides]);

  /** Текущее состояние */
  const [current, setCurrent] = useState(0);
  const clampIndex = (i: number) => (total === 0 ? 0 : (i + total) % total);
  const prev = () => setCurrent((c) => clampIndex(c - 1));
  const next = () => setCurrent((c) => clampIndex(c + 1));
  const goTo = (i: number) => setCurrent(clampIndex(i));

  /** Управление клавиатурой (доступность) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey as any, { passive: true } as any);
    return () => window.removeEventListener("keydown", onKey as any);
  }, [total]);

  /** Свайпы/drag через Pointer Events (работает и на мыши, и на тач) */
  const trackRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ active: boolean; startX: number; dx: number }>({ active: false, startX: 0, dx: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { active: true, startX: e.clientX, dx: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    drag.current.dx = e.clientX - drag.current.startX;
    if (trackRef.current && !isMobile) {
      // подсдвиг трека при drag (десктоп)
      trackRef.current.style.transform = `translateX(calc(-${current * 100}% + ${drag.current.dx}px))`;
    }
  };
  const onPointerUp = () => {
    if (!drag.current.active) return;
    const dx = drag.current.dx;
    drag.current.active = false;
    drag.current.dx = 0;

    const threshold = 40; // порог свайпа
    if (dx > threshold) prev();
    else if (dx < -threshold) next();
    // откат трансформа
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${current * 100}%)`;
    }
  };

  if (total === 0) {
    return (
      <div className="relative w-full h-[360px] md:h-[520px] grid place-items-center">
        <span className="rounded-full bg-white px-4 py-2 ring-1 ring-black/10 text-neutral-700">
          Загрузка…
        </span>
      </div>
    );
  }

  /** ====== Мобильный режим: один слайд, лёгкие кнопки/точки ====== */
  if (isMobile) {
    const html = slides[current];
    const k = keys[current];
    return (
      <section
        aria-label="Портфолио — карусель"
        className="relative w-full h-[min(72svh,520px)]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* текущий слайд (монтируем только его) */}
        <div
          key={k}
          className={`absolute inset-0 ${reduced ? "" : "transition-opacity duration-200 ease-out"} will-change-opacity`}
          style={{ opacity: 1 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Стрелки — простые, без блюра */}
        <button
          aria-label="Предыдущий"
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 grid place-items-center
                     h-9 w-9 rounded-full bg-white hover:bg-neutral-50 transition ring-1 ring-black/10 shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          aria-label="Следующий"
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 grid place-items-center
                     h-9 w-9 rounded-full bg-white hover:bg-neutral-50 transition ring-1 ring-black/10 shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" className="text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* Точки */}
        <nav className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4" aria-label="Навигация по слайдам">
          {slides.map((_s, idx) => {
            const active = idx === current;
            return (
              <button
                key={keys[idx]}
                onClick={() => goTo(idx)}
                aria-label={`Слайд ${idx + 1}`}
                aria-current={active ? "true" : undefined}
                className={`h-2 w-2 rounded-full transition outline-none focus:ring-2 focus:ring-black/20
                            ${active ? "bg-neutral-900" : "bg-neutral-300 hover:bg-neutral-400"}`}
              />
            );
          })}
        </nav>
      </section>
    );
  }

  /** ====== Десктоп/планшет: трек с transform и мягкими шторками ====== */
  return (
    <section
      aria-label="Портфолио — карусель"
      className="relative w-full h-[clamp(420px,70svh,720px)]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Клиппер */}
      <div className="absolute inset-0 overflow-hidden md:rounded-xl ">
        {/* Трек */}
        <div
          ref={trackRef}
          className={`relative flex h-full w-full will-change-transform ${reduced ? "" : "transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"}`}
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
              {/* Шторки (лёгкие, без backdrop-blur) */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white via-white/60 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white via-white/60 to-transparent" />
            </div>
          ))}
        </div>
      </div>

      {/* Стрелки */}
      <button
        aria-label="Предыдущий"
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center
                   h-10 w-10 rounded-full bg-white hover:bg-neutral-50 transition
                   ring-1 ring-black/10 shadow-sm outline-none focus:ring-2 focus:ring-black/20"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" className="text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        aria-label="Следующий"
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 grid place-items-center
                   h-10 w-10 rounded-full bg-white hover:bg-neutral-50 transition
                   ring-1 ring-black/10 shadow-sm outline-none focus:ring-2 focus:ring-black/20"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" className="text-neutral-900" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Точки */}
      <nav className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6" aria-label="Навигация по слайдам">
        {slides.map((_s, idx) => {
          const active = idx === current;
          return (
            <button
              key={keys[idx]}
              onClick={() => goTo(idx)}
              aria-label={`Слайд ${idx + 1}`}
              aria-current={active ? "true" : undefined}
              className={`h-[10px] w-[10px] rounded-full ring-1 transition outline-none focus:ring-2 focus:ring-black/20
                          ${active ? "bg-neutral-900 ring-black/20 scale-110" : "bg-neutral-300 ring-black/10 hover:bg-neutral-400"}`}
            />
          );
        })}
      </nav>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 md:h-2 bg-gradient-to-t from-white via-white/80 to-transparent" />
    </section>
  );
}
