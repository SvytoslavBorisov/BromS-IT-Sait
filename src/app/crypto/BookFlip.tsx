// src/app/crypto/BookFlip.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MainPageClient from "./MainPageClient";
import CryptoLandingClient from "./CryptoLandingClient";

type Dir = "toBlack" | "toWhite" | null;

const EASE = "cubic-bezier(0.26, 0.08, 0.25, 1)";
const DURATION_MS = 700;

export default function BookFlip() {
  const router = useRouter();
  const search = useSearchParams();

  // начальное состояние из URL
  const initialFlipped = search?.get("page") === "black";
  const [flipped, setFlipped] = useState<boolean>(initialFlipped);
  const [animDir, setAnimDir] = useState<Dir>(null);

  const rootRef  = useRef<HTMLDivElement | null>(null);
  const whiteRef = useRef<HTMLDivElement | null>(null);
  const blackRef = useRef<HTMLDivElement | null>(null);

  const isAnimatingRef = useRef(false);
  const lastWhiteHRef  = useRef(0);
  const lastBlackHRef  = useRef(0);
  const rafMeasureRef  = useRef<number | null>(null);

  // detect reduced motion once
  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  const setVars = useCallback((vars: Record<string, string>) => {
    if (!rootRef.current) return;
    const s = rootRef.current.style;
    for (const [k, v] of Object.entries(vars)) s.setProperty(k, v);
  }, []);

  // Единая функция замера и применения высот
  const measureHeights = useCallback(() => {
    if (!rootRef.current) return;

    const vp = typeof window !== "undefined" ? window.innerHeight : 0;
    const w  = whiteRef.current?.scrollHeight ?? 0;
    const b  = blackRef.current?.scrollHeight ?? 0;

    const wTarget = Math.max(w, vp);
    const bTarget = Math.max(b, vp);

    const changed = (wTarget !== lastWhiteHRef.current) || (bTarget !== lastBlackHRef.current);
    if (!changed) return;

    lastWhiteHRef.current = wTarget;
    lastBlackHRef.current = bTarget;

    setVars({
      "--hWhite": `${wTarget}px`,
      "--hBlack": `${bTarget}px`,
    });

    if (!isAnimatingRef.current) {
      // держим консистентность from/to под активную страницу
      const active = flipped ? "var(--hBlack)" : "var(--hWhite)";
      setVars({
        "--hFrom": active,
        "--hTo": active,
      });
    }
  }, [flipped, setVars]);

  const scheduleMeasure = useCallback(() => {
    if (rafMeasureRef.current != null) return;
    rafMeasureRef.current = requestAnimationFrame(() => {
      rafMeasureRef.current = null;
      measureHeights();
    });
  }, [measureHeights]);

  // Инициализация и observers
  useEffect(() => {
    scheduleMeasure();

    const ro = new ResizeObserver(() => scheduleMeasure());
    if (whiteRef.current) ro.observe(whiteRef.current);
    if (blackRef.current) ro.observe(blackRef.current);

    const onResize = () => scheduleMeasure();
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      if (rafMeasureRef.current) cancelAnimationFrame(rafMeasureRef.current);
      rafMeasureRef.current = null;
    };
  }, [scheduleMeasure]);

  // Синхронизация URL <-> состояние
  useEffect(() => {
    const desired = flipped ? "black" : "white";
    const current = search?.get("page") ?? "white";
    if (current !== desired) {
      router.replace(`?page=${desired}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  const finishFlip = useCallback((to: "black" | "white") => {
    setFlipped(to === "black");
    setAnimDir(null);
    isAnimatingRef.current = false;

    // фиксируем конечные значения
    const targetVar = to === "black" ? "var(--hBlack)" : "var(--hWhite)";
    setVars({
      "--hFrom": targetVar,
      "--hTo": targetVar,
      "--cut":   to === "black" ? "100%" : "0%",
      "--t":     to === "black" ? "1" : "0",
    });
  }, [setVars]);

  const startFlip = useCallback((to: "black" | "white") => {
    if (!rootRef.current) return;
    if (isAnimatingRef.current) return;

    isAnimatingRef.current = true;
    setAnimDir(to === "black" ? "toBlack" : "toWhite");

    // подготавливаем from/to высоты
    setVars({
      "--hFrom": to === "black" ? "var(--hWhite)" : "var(--hBlack)",
      "--hTo":   to === "black" ? "var(--hBlack)" : "var(--hWhite)",
    });

    if (reducedMotion) {
      // без анимации — мгновенно
      finishFlip(to);
      return;
    }

    // триггерим CSS-переходы по custom properties
    requestAnimationFrame(() => {
      setVars({
        "--cut": to === "black" ? "100%" : "0%",
        "--t":   to === "black" ? "1" : "0",
      });

      // ждём конец transition (вешаем на root)
      const el = rootRef.current!;
      const onEnd = (e: TransitionEvent) => {
        if (e.target !== el) return;
        if (e.propertyName !== "--t" && e.propertyName !== "--cut") return;
        el.removeEventListener("transitionend", onEnd);
        finishFlip(to);
      };
      el.addEventListener("transitionend", onEnd);
    });
  }, [finishFlip, reducedMotion, setVars]);

  const peelForward = useCallback(() => startFlip("black"), [startFlip]);
  const peelBack    = useCallback(() => startFlip("white"), [startFlip]);

  // Маска верхней (белой) страницы
  const whiteMask =
    animDir === "toBlack"
      ? "linear-gradient(to bottom left, transparent var(--cut), #fff var(--cut))"
      : animDir === "toWhite"
      ? "linear-gradient(to bottom right, transparent var(--cut), #fff var(--cut))"
      : flipped
      ? "linear-gradient(to bottom left, transparent 100%, #fff 100%)"
      : "linear-gradient(to bottom left, transparent 0%, #fff 0%)";

  const showTRonWhite = !flipped || animDir === "toBlack";
  const showTLonBlack = (flipped && !animDir) || animDir === "toWhite";

  // клавиатура: ←/→
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.key === "ArrowRight") { peelForward(); e.preventDefault(); }
    if (e.key === "ArrowLeft")  { peelBack();    e.preventDefault(); }
  }, [peelForward, peelBack]);

  return (
    <div
      ref={rootRef}
      className="relative bg-black text-white outline-none"
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-live="polite"
      style={{
        // высота анимируется через var(--t)
        height: "calc((1 - var(--t, 0)) * var(--hFrom, 100vh) + var(--t, 0) * var(--hTo, 100vh))",
        minHeight: "100vh",
        isolation: "isolate",
        overflow: "hidden",

        // начальные значения (SSR-safe)
        ["--hFrom" as any]: initialFlipped ? "var(--hBlack)" : "var(--hWhite)",
        ["--hTo"   as any]: initialFlipped ? "var(--hBlack)" : "var(--hWhite)",
        ["--t"     as any]: initialFlipped ? "1" : "0",
        ["--cut"   as any]: initialFlipped ? "100%" : "0%",
      }}
    >
      {/* нижняя (чёрная) страница */}
      <div
        className="absolute inset-0 z-10"
        aria-hidden={!flipped && !animDir}
        style={{
          transform: "translateZ(0)",
          isolation: "isolate",
          overflow: "hidden",
          pointerEvents: flipped ? "auto" : "none",
          visibility: (!flipped && !animDir) ? "hidden" : "visible", // не рисуем, когда точно не нужна
          willChange: "opacity, transform",
        }}
      >
        <div ref={blackRef}>
          <CryptoLandingClient />
        </div>
      </div>

      {/* верхняя (белая) страница — маскируемая */}
      <div
        className="absolute inset-0 z-20 bg-white text-black"
        style={{
          WebkitMaskImage: whiteMask,
          maskImage: whiteMask,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          transform: "translateZ(0)",
          isolation: "isolate",
          overflow: "hidden",
          pointerEvents: flipped ? "none" : "auto",
          visibility: (flipped && !animDir) ? "hidden" : "visible",
          willChange: "transform, -webkit-mask-image, mask-image",
        }}
      >
        <div ref={whiteRef}>
          <MainPageClient />
        </div>

        {/* Уголок top-right (белый → чёрный) */}
        {showTRonWhite && (
          <button
            aria-label="Перелистнуть вперёд (белый → чёрный)"
            onClick={peelForward}
            className="absolute top-0 right-0 w-[170px] h-[170px] select-none z-100"
            style={{
              clipPath: "polygon(100% 0%, calc(100% - var(--curl, 28px)) 0%, 100% var(--curl, 28px))",
              background:
                "radial-gradient(120px 120px at 100% 0%, rgba(0,0,0,0.22), rgba(0,0,0,0) 60%), linear-gradient(135deg, #ffffff 35%, #efefef 65%, #ffffff 85%)",
              boxShadow: "inset -6px 6px 10px rgba(0,0,0,0.08), 0 1px 0 rgba(0,0,0,0.06)",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.25))",
            }}
          />
        )}
      </div>

      {/* Отдельный оверлей для уголка на чёрном (виден при чёрном активном) */}
      {showTLonBlack && (
        <div
          className="absolute inset-0 z-30 pointer-events-none"
          aria-hidden={false}
          style={{ isolation: "isolate" }}
        >
          <button
            aria-label="Перелистнуть назад (чёрный → белый)"
            onClick={peelBack}
            className="absolute top-0 left-0 w-[170px] h-[170px] select-none pointer-events-auto"
            style={{
              clipPath: "polygon(0% 0%, var(--curl, 28px) 0%, 0% var(--curl, 28px))",
              background:
                "radial-gradient(120px 120px at 0% 0%, rgba(255,255,255,0.15), rgba(255,255,255,0) 60%), linear-gradient(225deg, #141414 40%, #000 65%, #0f0f0f 85%)",
              boxShadow: "inset 6px 6px 10px rgba(255,255,255,0.06), 0 1px 0 rgba(255,255,255,0.05)",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))",
            }}
          />
        </div>
      )}

      {/* Глобальные CSS: регистрация custom properties + transitions */}
      <style>{`
        /* Регистрация свойств, чтобы они плавно анимировались (и были интерполируемыми) */
        @property --t     { syntax: '<number>';     inherits: false; initial-value: 0; }
        @property --cut   { syntax: '<percentage>'; inherits: false; initial-value: 0%; }
        @property --hFrom { syntax: '<length>';     inherits: false; initial-value: 100vh; }
        @property --hTo   { syntax: '<length>';     inherits: false; initial-value: 100vh; }
        @property --hWhite{ syntax: '<length>';     inherits: false; initial-value: 100vh; }
        @property --hBlack{ syntax: '<length>';     inherits: false; initial-value: 100vh; }

        /* Транзишним только переменные; браузер сам пересчитает height на каждом кадре */
        [data-bookflip-root], .relative.bg-black {
          transition:
            --t ${DURATION_MS}ms ${EASE},
            --cut ${DURATION_MS}ms ${EASE};
        }

        @media (prefers-reduced-motion: reduce) {
          [data-bookflip-root], .relative.bg-black {
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
