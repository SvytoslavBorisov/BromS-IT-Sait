// src/app/crypto/blog/[slug]/ReaderChrome.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { PdfButton } from "@/components/blog/PdfButton";

type Meta = {
  title?: string;
  description?: string;
  date?: string;
  tags?: string[];
  cover?: string;
};

type ThemeKey = "paper" | "sepia" | "night";

const THEME_PRESETS: Record<
  ThemeKey,
  {
    main: string;        // фон страницы
    surface: string;     // карточка
    coverOverlay: string;
    prose: string;       // типографика
    code: string;        // цвет inline-кода
    pre: string;         // оформление <pre>
    math: string;        // фон формул
    chipBg: string;      // фон чипсов
    chipText: string;    // текст чипсов
    selectBorder: string;// бордер селектора темы
    selectBg: string;    // фон селектора
  }
> = {
  paper: {
    main:
      "bg-gradient-to-br from-stone-50 via-white to-stone-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950",
    surface:
      "bg-white/95 dark:bg-neutral-950/95 rounded-3xl shadow-2xl backdrop-blur-sm",
    coverOverlay: "bg-gradient-to-t from-black/70 to-transparent",
    prose:
      "prose prose-stone dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed",
    code: "prose-code:text-emerald-700 dark:prose-code:text-emerald-300",
    pre: "prose-pre:bg-stone-50 dark:prose-pre:bg-neutral-900 prose-pre:rounded-xl prose-pre:p-4",
    math:
      "prose-math:my-4 prose-math:px-3 prose-math:py-2 prose-math:bg-stone-50/70 dark:prose-math:bg-neutral-900/70 prose-math:rounded-xl",
    chipBg: "bg-stone-100 dark:bg-neutral-800",
    chipText: "text-stone-700 dark:text-neutral-200",
    selectBorder: "border-neutral-300 dark:border-neutral-700",
    selectBg: "bg-white/80 dark:bg-neutral-900/70",
  },
  sepia: {
    main:
      "bg-gradient-to-br from-amber-50 via-amber-50 to-stone-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950",
    surface:
      "bg-amber-50/95 dark:bg-neutral-950/95 rounded-3xl shadow-2xl backdrop-blur-sm",
    coverOverlay: "bg-gradient-to-t from-black/70 to-transparent",
    prose:
      "prose prose-amber dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed",
    code: "prose-code:text-emerald-700 dark:prose-code:text-emerald-300",
    pre: "prose-pre:bg-amber-100 dark:prose-pre:bg-neutral-900 prose-pre:rounded-xl prose-pre:p-4",
    math:
      "prose-math:my-4 prose-math:px-3 prose-math:py-2 prose-math:bg-amber-100/80 dark:prose-math:bg-neutral-900/70 prose-math:rounded-xl",
    chipBg: "bg-amber-100 dark:bg-neutral-800",
    chipText: "text-amber-900 dark:text-neutral-200",
    selectBorder: "border-amber-300/70 dark:border-neutral-700",
    selectBg: "bg-amber-50/80 dark:bg-neutral-900/70",
  },
  night: {
    main: "bg-gradient-to-br from-neutral-950 via-neutral-900 to-black",
    surface:
      "bg-neutral-950/95 rounded-3xl shadow-2xl ring-1 ring-white/5 backdrop-blur-sm",
    coverOverlay: "bg-gradient-to-t from-black/75 to-transparent",
    prose:
      "prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed",
    code: "prose-code:text-emerald-300",
    pre: "prose-pre:bg-neutral-900 prose-pre:rounded-xl prose-pre:p-4",
    math:
      "prose-math:my-4 prose-math:px-3 prose-math:py-2 prose-math:bg-neutral-900/80 prose-math:rounded-xl",
    chipBg: "bg-neutral-800",
    chipText: "text-neutral-200",
    selectBorder: "border-neutral-700",
    selectBg: "bg-neutral-900/70",
  },
};

export default function ReaderChrome({
  meta,
  slug,
  defaultTheme = "paper",
  children,
}: {
  meta: Meta;
  slug: string;
  defaultTheme?: ThemeKey;
  children: React.ReactNode;
}) {
  // читаем из localStorage (если есть), иначе из пропса
  const [theme, setTheme] = useState<ThemeKey>(defaultTheme);

  useEffect(() => {
    const saved = (typeof window !== "undefined" &&
      (localStorage.getItem("reader-theme") as ThemeKey | null)) || null;
    if (saved && (["paper", "sepia", "night"] as ThemeKey[]).includes(saved)) {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    // сохраняем выбор
    if (typeof window !== "undefined") {
      localStorage.setItem("reader-theme", theme);
    }
  }, [theme]);

  const t = useMemo(() => THEME_PRESETS[theme], [theme]);

  return (
    <main
      className={`flex justify-center px-4 py-6 sm:py-8 md:py-12 min-h-screen ${t.main}`}
    >
      <article className={`w-full max-w-4xl overflow-hidden ${t.surface}`}>
        {/* cover */}
        {meta.cover && (
          <div className="relative w-full h-48 sm:h-60 md:h-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={meta.cover}
              alt={meta.title ?? "cover"}
              className="w-full h-full object-cover"
            />
            <div className={`absolute inset-0 ${t.coverOverlay}`} />
            <h1 className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 text-2xl sm:text-3xl md:text-4xl font-extrabold text-white drop-shadow-lg pr-6">
              {meta.title}
            </h1>
          </div>
        )}

        <div className="p-5 sm:p-8 md:p-12">
          {/* ===== Toolbar =====
              Слева: селектор темы + теги
              Справа: дата + кнопка PDF (в одном ряду) */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
            {/* left block */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* селектор темы */}
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <span className="hidden xs:inline">Тема:</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as ThemeKey)}
                  className={`rounded-xl border ${t.selectBorder} ${t.selectBg} px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500`}
                  aria-label="Выбор темы чтения"
                >
                  <option value="paper">Светлая (Paper)</option>
                  <option value="sepia">Сепия</option>
                  <option value="night">Ночной</option>
                </select>
              </label>

              {/* теги (в одну строку, переносятся на мобиле) */}
              {meta?.tags && meta.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {meta.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.chipBg} ${t.chipText}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* spacer */}
            <div className="flex-1" />

            {/* right block: дата + PDF */}
            <div className="flex items-center gap-3 sm:gap-4">
              {meta?.date && (
                <span className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                  {new Date(meta.date).toLocaleDateString("ru-RU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
              <PdfButton slug={slug} />
            </div>
          </div>

          {/* описание */}
          {meta?.description && (
            <p className="text-base sm:text-lg text-neutral-700 dark:text-neutral-300 leading-relaxed mb-6 sm:mb-8">
              {meta.description}
            </p>
          )}

          {/* контент */}
          <section className={`${t.prose} ${t.code} ${t.pre} ${t.math}`}>
            {children}
          </section>
        </div>
      </article>

      {/* --- Хак, чтобы Tailwind не выкинул классы в JIT (safelist через видимые литералы) --- */}
      <div className="hidden">
        bg-stone-50 bg-stone-100 bg-amber-50 bg-neutral-900 bg-neutral-950
        prose-stone prose-amber prose-neutral
        dark:prose-invert ring-white/5
      </div>
    </main>
  );
}
