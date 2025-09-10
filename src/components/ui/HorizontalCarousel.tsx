"use client";

import React, { useRef } from "react";
import clsx from "clsx";

type Props = {
  items: React.ReactNode[];
  /** Ширина карточки на мобиле */
  cardWidth?: string;                 // default: min(80vw, 360px)
  /** gap между карточками (px) */
  gapPx?: number;                     // default: 16
  /** Показывать стрелки на ≥ md (на мобиле скрыты всегда) */
  showArrows?: boolean;               // default: true
  /** Внешний «контейнерный» отступ, совпадает с px-6 (=24px) */
  edgeGutterPx?: number;              // default: 24
  /** Доп. отступ слева к ПЕРВОЙ карточке сверх gutter (px) */
  firstItemOffsetPx?: number;         // default: 16
  className?: string;
  ariaLabel?: string;
};

export default function HorizontalCarousel({
  items,
  cardWidth = "min(80vw, 360px)",
  gapPx = 16,
  showArrows = true,
  edgeGutterPx = 24,
  firstItemOffsetPx = 16,
  className,
  ariaLabel,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const scrollByCards = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const cardW = card ? card.offsetWidth : 320;
    el.scrollBy({ left: dir * (cardW + gapPx) * 1.2, behavior: "smooth" });
  };

  return (
    <div className={clsx("relative", className)} aria-label={ariaLabel}>
      {/* Стрелки: скрыты на мобиле, доступны на ≥ md */}
      {showArrows && (
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 hidden md:flex items-center justify-between px-1">
          <button
            onClick={() => scrollByCards(-1)}
            className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/15 transition"
            aria-label="Назад"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={() => scrollByCards(1)}
            className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/15 transition"
            aria-label="Вперёд"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      <div
        ref={scrollerRef}
        className="
          flex overflow-x-auto snap-x snap-mandatory pb-2
          [-ms-overflow-style:'none'] [scrollbar-width:'none'] [&::-webkit-scrollbar]:hidden
        "
        style={{
          columnGap: `${gapPx}px`,
          scrollPaddingLeft: firstItemOffsetPx, // чтобы snap-start не прилипал к краю
        }}
      >
        {items.map((node, i) => (
          <div
            key={i}
            data-card
            className="snap-start shrink-0"
            style={{
              width: cardWidth,
              marginLeft: i === 0 ? `${firstItemOffsetPx}px` : undefined, // аккуратный «воздух» у первой
            }}
          >
            {node}
          </div>
        ))}
      </div>
    </div>
  );
}
