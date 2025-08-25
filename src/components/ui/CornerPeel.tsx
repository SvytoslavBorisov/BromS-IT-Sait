// CornerPeel.tsx — готовый компонент
"use client";
import React, { useRef, useEffect, useState } from "react";

type Props = {
  corner?: "top-right" | "top-left";
  width?: number;   // размер «угла», px
  onOpenChange?: (opened: boolean) => void;
  initiallyOpen?: boolean;
  /** верхний и нижний контент */
  Front: React.ComponentType;
  Back: React.ComponentType;
};

export default function CornerPeel({
  corner = "top-right",
  width = 180,
  onOpenChange,
  initiallyOpen = false,
  Front,
  Back,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(initiallyOpen); // true = снято (виден нижний)
  const [t, setT] = useState(initiallyOpen ? 1 : 0); // прогресс 0..1
  const dragging = useRef(false);

  // плавная анимация к целевому t
  const tweenTo = (target: number, ms = 550) => {
    const start = performance.now();
    const from = t;
    const run = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - p, 3);
      setT(from + (target - from) * ease);
      if (p < 1) requestAnimationFrame(run);
      else {
        const opened = target > 0.99;
        setOpen(opened);
        onOpenChange?.(opened);
      }
    };
    requestAnimationFrame(run);
  };

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;
    e.preventDefault();
  };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    // щёлк к ближайшему состоянию
    tweenTo(t > 0.5 ? 1 : 0);
  };
  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging.current || !root.current) return;
    const rect = root.current.getBoundingClientRect();
    const max = width;
    if (corner === "top-right") {
      const x = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const y = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      const dx = Math.max(0, rect.right - x);
      const dy = Math.max(0, y - rect.top);
      const d = Math.min(max, Math.hypot(dx, dy));
      setT(d / max);
    } else {
      const x = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const y = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      const dx = Math.max(0, x - rect.left);
      const dy = Math.max(0, y - rect.top);
      const d = Math.min(max, Math.hypot(dx, dy));
      setT(d / max);
    }
  };

  // геометрия «угла»
  const curl = 28 + (width - 28) * t; // радиус «заворота»
  const cut = 100 * t;                // для маски: %
  const isTR = corner === "top-right";

  return (
    <div
      ref={root}
      className="relative"
      style={{
        minHeight: "100vh",
        isolation: "isolate",
        overflow: "hidden",
      }}
      onMouseLeave={onUp}
      onMouseUp={onUp}
      onTouchEnd={onUp}
      onTouchCancel={onUp}
    >
      {/* Нижний слой (чёрный/любой) */}
      <div className="absolute inset-0 z-10 pointer-events-auto">
        <Back />
      </div>

      {/* Верхний слой (белый), режется маской */}
      <div
        className="absolute inset-0 z-20 bg-white text-black"
        style={{
          WebkitMaskImage: isTR
            ? "linear-gradient(to bottom left, transparent var(--cut), #fff var(--cut))"
            : "linear-gradient(to bottom right, transparent var(--cut), #fff var(--cut))",
          maskImage: isTR
            ? "linear-gradient(to bottom left, transparent var(--cut), #fff var(--cut))"
            : "linear-gradient(to bottom right, transparent var(--cut), #fff var(--cut))",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          ["--cut" as any]: `${cut}%`,
          pointerEvents: open ? "none" : "auto",
        }}
      >
        <Front />
      </div>

      {/* Глянцевый «уголок» с мягкой тенью — отдельный слой поверх */}
      <svg
        className="absolute z-30 select-none"
        style={{
          top: 0,
          [isTR ? "right" : "left"]: 0,
          width,
          height: width,
          transform: isTR ? "scaleX(1)" : "scaleX(-1)", // переиспользуем path
          pointerEvents: "none",
        }}
        viewBox={`0 0 ${width} ${width}`}
      >
        {/* мягкая тень под загнутым листом */}
        <defs>
          <radialGradient id="curlShade" cx="1" cy="0" r="1.1">
            <stop offset="0%" stopOpacity="0.35" />
            <stop offset="60%" stopOpacity="0.15" />
            <stop offset="100%" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="paperSheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="35%" stopColor="#fff" />
            <stop offset="65%" stopColor="#efefef" />
            <stop offset="100%" stopColor="#fff" />
          </linearGradient>
        </defs>

        {/* полоса «глянца» */}
        <path
          d={`M0,0 L${curl},0 0,${curl} Z`}
          fill="url(#paperSheen)"
          opacity={0.9}
        />
        {/* тень под углом */}
        <ellipse
          cx={curl * 0.55}
          cy={curl * 0.55}
          rx={curl * 0.9}
          ry={curl * 0.7}
          fill="url(#curlShade)"
        />
      </svg>

      {/* Кликабельная зона «уголка» (поверх), drag для открытия/закрытия */}
      <div
        onMouseDown={onDown as any}
        onMouseMove={onMove as any}
        onTouchStart={onDown as any}
        onTouchMove={onMove as any}
        className="absolute z-40"
        role="button"
        aria-label={open ? "Закрыть (вернуть верхнюю страницу)" : "Открыть (снять верхнюю страницу)"}
        style={{
          top: 0,
          [isTR ? "right" : "left"]: 0,
          width,
          height: width,
          clipPath: isTR
            ? `polygon(100% 0%, calc(100% - ${curl}px) 0%, 100% ${curl}px)`
            : `polygon(0% 0%, ${curl}px 0%, 0% ${curl}px)`,
          background: isTR
            ? "radial-gradient(120px 120px at 100% 0%, rgba(0,0,0,0.22), rgba(0,0,0,0) 60%)"
            : "radial-gradient(120px 120px at 0% 0%, rgba(255,255,255,0.15), rgba(255,255,255,0) 60%)",
          boxShadow: isTR
            ? "inset -6px 6px 10px rgba(0,0,0,0.08), 0 1px 0 rgba(0,0,0,0.06)"
            : "inset 6px 6px 10px rgba(255,255,255,0.06), 0 1px 0 rgba(255,255,255,0.05)",
          filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))",
          cursor: "pointer",
          pointerEvents: "auto",
        }}
        onClick={() => tweenTo(open ? 0 : 1)}
      />
    </div>
  );
}
