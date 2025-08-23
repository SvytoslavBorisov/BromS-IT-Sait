"use client";

import * as React from "react";

/**
 * Генерирует оглавление по заголовкам H2/H3 внутри ближайшего <article>.
 * - Автоматически проставляет id, если отсутствуют (slugify по тексту).
 * - Подсвечивает активный пункт при скролле.
 * Использование: просто вставь <Toc /> в начале MDX или в layout статьи.
 */
export function Toc() {
  const [items, setItems] = React.useState<
    { id: string; text: string; level: 2 | 3 }[]
  >([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const article = document.querySelector("article") ?? document.body;
    const headings = Array.from(
      article.querySelectorAll<HTMLHeadingElement>("h2, h3")
    );

    const slugify = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

    const list = headings.map((h) => {
      if (!h.id) h.id = slugify(h.textContent ?? "");
      return {
        id: h.id,
        text: h.textContent ?? "",
        level: (h.tagName === "H3" ? 3 : 2) as 2 | 3,
      };
    });

    setItems(list);

    // Подсветка активного заголовка
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
        if (visible[0]) setActiveId((visible[0].target as HTMLElement).id);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: [0, 1] }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, []);

  if (!items.length) return null;

  return (
    <nav
      aria-label="Оглавление"
      className="no-print mb-6 rounded-xl border bg-muted/20 p-4 text-sm"
    >
      <div className="mb-2 font-medium">Содержание</div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id} className={it.level === 3 ? "pl-4" : ""}>
            <a
              href={`#${it.id}`}
              className={
                "inline-block transition-colors hover:text-primary " +
                (activeId === it.id ? "text-primary font-medium" : "text-foreground/80")
              }
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
