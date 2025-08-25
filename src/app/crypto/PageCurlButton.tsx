"use client";

import React from "react";

/**
 * PageCurlButton — кликабельный «загнутый угол» страницы с эффектом как в CodePen.
 * Никаких изображений: только градиенты, тени и clip-path.
 *
 * Props:
 * - corner: "top-right" | "top-left"
 * - size: базовый размер уголка (px). При :hover плавно растёт.
 * - onClick: действие при клике (перелистывание)
 * - dark: если true — рисуем «тёмную» сторону (для чёрной страницы), иначе светлую (для белой)
 * - className: опционально, чтобы дополнительно позиционировать контейнер
 */
type Corner = "top-right" | "top-left";
type Props = {
  corner: Corner;
  size?: number;
  onClick?: () => void;
  dark?: boolean;
  className?: string;
  ariaLabel?: string;
};

export default function PageCurlButton({
  corner,
  size = 120,
  onClick,
  dark = false,
  className,
  ariaLabel,
}: Props) {
  const isTR = corner === "top-right";

  return (
    <button
      aria-label={ariaLabel ?? (isTR ? "Перелистнуть вперёд" : "Перелистнуть назад")}
      onClick={onClick}
      className={[
        "group absolute select-none outline-none",
        isTR ? "top-0 right-0" : "top-0 left-0",
        "pointer-events-auto",
        className ?? "",
      ].join(" ")}
      style={
        {
          // управляемый базовый размер уголка
          ["--curl-base" as any]: `${size}px`,
          ["--curl-grow" as any]: `${Math.round(size * 1.55)}px`,
          // тени/свет в зависимости от темы странички
          ["--sheet1" as any]: dark ? "#0f0f0f" : "#ffffff",
          ["--sheet2" as any]: dark ? "#1a1a1a" : "#efefef",
          ["--shadow1" as any]: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
          ["--shadow2" as any]: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
          ["--glow" as any]: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.22)",
          width: "var(--curl-size)",
          height: "var(--curl-size)",
          // анимируем сам размер (эффект «подтягивается» при hover)
          transition: "width .28s cubic-bezier(.26,.08,.25,1), height .28s cubic-bezier(.26,.08,.25,1)",
          // начальный размер
          ["--curl-size" as any]: "var(--curl-base)",
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.setProperty("--curl-size", "var(--curl-grow)");
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.setProperty("--curl-size", "var(--curl-base)");
      }}
    >
      {/* Слой-«подложка», создаёт мягкую тень от загнутого уголка (уменьшенная диагональ) */}
      <span
        aria-hidden
        className="absolute inset-0 block"
        style={{
          // диагональная тень от загиба страницы
          background: isTR
            ? "radial-gradient(120px 120px at 100% 0%, var(--glow), rgba(0,0,0,0) 60%)"
            : "radial-gradient(120px 120px at 0% 0%, var(--glow), rgba(0,0,0,0) 60%)",
          // ограничиваем видимую область треугольником уголка
          clipPath: isTR
            ? "polygon(100% 0%, calc(100% - var(--curl-size)) 0%, 100% var(--curl-size))"
            : "polygon(0% 0%, var(--curl-size) 0%, 0% var(--curl-size))",
          filter: dark
            ? "drop-shadow(0 4px 6px rgba(0,0,0,0.35))"
            : "drop-shadow(0 4px 6px rgba(0,0,0,0.25))",
        }}
      />

      {/* Сам «лист» загиба — двухцветный градиент как бумага (или чёрный лист) */}
      <span
        aria-hidden
        className="absolute inset-0 block"
        style={{
          background: isTR
            ? `linear-gradient(135deg, var(--sheet1) 35%, var(--sheet2) 65%, var(--sheet1) 85%)`
            : `linear-gradient(225deg, var(--sheet1) 40%, var(--sheet2) 65%, var(--sheet1) 85%)`,
          boxShadow: isTR
            ? `inset -6px 6px 10px var(--shadow1), 0 1px 0 var(--shadow2)`
            : `inset 6px 6px 10px var(--shadow1), 0 1px 0 var(--shadow2)`,
          clipPath: isTR
            ? "polygon(100% 0%, calc(100% - var(--curl-size)) 0%, 100% var(--curl-size))"
            : "polygon(0% 0%, var(--curl-size) 0%, 0% var(--curl-size))",
        }}
      />
    </button>
  );
}
