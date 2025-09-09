"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { animate } from "framer-motion";

const EASE = [0.26, 0.08, 0.25, 1] as const;
type Dir = "toBlack" | "toWhite" | null;

// ✅ Ленивая загрузка: каждая страница грузится только когда реально нужна
const MainPageClient = dynamic(() => import("./MainPageClient"), { ssr: false });
const CryptoLandingClient = dynamic(() => import("./CryptoLandingClient"), { ssr: false });

export default function BookFlip() {
  const router = useRouter();
  const search = useSearchParams();

  const initialFlipped = search?.get("page") === "black"; // true => чёрный активен
  const [flipped, setFlipped] = useState<boolean>(initialFlipped);
  const [animDir, setAnimDir] = useState<Dir>(null);

  const rootRef  = useRef<HTMLDivElement | null>(null);
  const whiteRef = useRef<HTMLDivElement | null>(null);
  const blackRef = useRef<HTMLDivElement | null>(null);

  // --- вычисления высоты без React-стейтов (чтобы не триггерить ререндер) ---
  const measureHeights = () => {
    if (!rootRef.current) return;
    const vp = typeof window !== "undefined" ? window.innerHeight : 0;
    const w = whiteRef.current?.scrollHeight ?? 0;
    const b = blackRef.current?.scrollHeight ?? 0;

    const r = rootRef.current.style;
    r.setProperty("--hWhite", `${Math.max(w, vp)}px`);
    r.setProperty("--hBlack", `${Math.max(b, vp)}px`);

    // при первом заходе/после быстрой загрузки — синхронизируем финальные значения
    if (!animDir) {
      const active = flipped ? "var(--hBlack)" : "var(--hWhite)";
      r.setProperty("--hFrom", active);
      r.setProperty("--hTo", active);
      r.setProperty("--cut", flipped ? "100%" : "0%");
      r.setProperty("--t", flipped ? "1" : "0");
    }
  };

  // ✅ Один раз вешаем ResizeObserver + resize, без завязки на анимацию/флип
  useLayoutEffect(() => {
    const ro = new ResizeObserver(() => requestAnimationFrame(measureHeights));
    if (whiteRef.current) ro.observe(whiteRef.current);
    if (blackRef.current) ro.observe(blackRef.current);

    const onResize = () => requestAnimationFrame(measureHeights);
    window.addEventListener("resize", onResize, { passive: true });

    // первая инициализация
    requestAnimationFrame(measureHeights);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Обновляем query без автоскролла
  useEffect(() => {
    const desired = flipped ? "black" : "white";
    const current = search?.get("page") ?? "white";
    if (current !== desired) router.replace(`?page=${desired}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped]);

  // --- запуск анимации перелистывания ---
  const startFlip = (to: "black" | "white") => {
    if (!rootRef.current) return;
    const r = rootRef.current.style;
    const fromCut = to === "black" ? 0 : 100;
    const toCut   = to === "black" ? 100 : 0;

    // анимации потребуются обе высоты — заранее измерим
    requestAnimationFrame(measureHeights);

    r.setProperty("--hFrom", to === "black" ? "var(--hWhite)" : "var(--hBlack)");
    r.setProperty("--hTo",   to === "black" ? "var(--hBlack)" : "var(--hWhite)");
    setAnimDir(to === "black" ? "toBlack" : "toWhite");

    const controls = animate(fromCut, toCut, {
      duration: 0.7,
      ease: EASE as any,
      onUpdate: (v) => {
        r.setProperty("--cut", `${v}%`);
        r.setProperty("--t", String(v / 100));
      },
      onComplete: () => {
        setFlipped(to === "black");
        setAnimDir(null);

        // финализация переменных
        const targetVar = to === "black" ? "var(--hBlack)" : "var(--hWhite)";
        r.setProperty("--hFrom", targetVar);
        r.setProperty("--hTo",   targetVar);
        r.setProperty("--cut",   to === "black" ? "100%" : "0%");
        r.setProperty("--t",     to === "black" ? "1" : "0");
      },
    });

    return () => controls.stop();
  };

  const peelForward = () => startFlip("black"); // белый → чёрный (угол top-right)
  const peelBack    = () => startFlip("white"); // чёрный → белый (угол top-left)

  // --- маска всегда на белой странице (верхней) ---
  const whiteMask =
    animDir === "toBlack"
      ? "linear-gradient(to bottom left, transparent var(--cut), #fff var(--cut))"
      : animDir === "toWhite"
      ? "linear-gradient(to bottom right, transparent var(--cut), #fff var(--cut))"
      : flipped
      ? "linear-gradient(to bottom left, transparent 100%, #fff 100%)"
      : "linear-gradient(to bottom left, transparent 0%, #fff 0%)";

  // --- что монтировать сейчас ---
  // монтируем чёрную страницу только если она активна ИЛИ мы в процессе перелистывания к ней
  const mountBlack = flipped || animDir === "toBlack";
  // белая — активна по умолчанию; при возврате к белой нужна во время "toWhite"
  const mountWhite = !flipped || animDir === "toWhite";

  // показывать уголки
  const showTRonWhite = (!flipped && mountWhite) || animDir === "toBlack";
  const showTLonBlack = (flipped && !animDir) || animDir === "toWhite";

  return (
    <div
      ref={rootRef}
      className="relative bg-black text-white"
      style={
        {
          height: "calc((1 - var(--t, 0)) * var(--hFrom, 100vh) + var(--t, 0) * var(--hTo, 100vh))",
          minHeight: "100vh",
          isolation: "isolate",
          overflow: "hidden",
          // стартовые значения (перезапишутся measureHeights())
          ["--hFrom" as any]: initialFlipped ? "var(--hBlack)" : "var(--hWhite)",
          ["--hTo"   as any]: initialFlipped ? "var(--hBlack)" : "var(--hWhite)",
          ["--t"     as any]: initialFlipped ? "1" : "0",
          ["--cut"   as any]: initialFlipped ? "100%" : "0%",
          willChange: "height",
        } as React.CSSProperties
      }
    >
      {/* ЧЁРНАЯ СТРАНИЦА (НИЖНЯЯ) — монтируем по необходимости */}
      <div
        className="absolute inset-0 z-10"
        style={{
          transform: "translateZ(0)",
          contain: "paint",
          isolation: "isolate",
          overflow: "hidden",
          pointerEvents: flipped ? "auto" : "none",
          visibility: mountBlack ? "visible" : "hidden",
        }}
      >
        {mountBlack && (
          <div ref={blackRef}>
            <CryptoLandingClient />
          </div>
        )}
      </div>

      {/* БЕЛАЯ СТРАНИЦА (ВЕРХНЯЯ, маскируемая) — всегда в DOM, но контент монтируем по необходимости */}
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
          contain: "paint",
          isolation: "isolate",
          overflow: "hidden",
          pointerEvents: flipped ? "none" : "auto",
        }}
      >
        {mountWhite && (
          <div ref={whiteRef}>
            <MainPageClient />
          </div>
        )}

        {/* Уголок top-right (перелистнуть вперёд — белый → чёрный) */}
        {showTRonWhite && (
          <button
            aria-label="Перелистнуть вперёд (белый → чёрный)"
            onClick={peelForward}
            className="z-100 absolute top-0 right-0 w-[170px] h-[170px] select-none"
            style={{
              clipPath: "polygon(100% 0%, calc(100% - var(--curl, 28px)) 0%, 100% var(--curl, 28px))",
              background:
                "radial-gradient(120px 120px at 100% 0%, rgba(0,0,0,0.22), rgba(0,0,0,0) 60%), linear-gradient(135deg, #ffffff 35%, #efefef 65%, #ffffff 85%)",
              boxShadow: "inset -6px 6px 10px rgba(0,0,0,0.08), 0 1px 0 rgba(0,0,0,0.06)",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.25))",
              willChange: "transform",
            }}
          />
        )}
      </div>

      {/* Оверлей для уголка на чёрном (перелистнуть назад) */}
      {showTLonBlack && (
        <div className="absolute inset-0 z-30 pointer-events-none" aria-hidden={false} style={{ isolation: "isolate" }}>
          <button
            aria-label="Перелистнуть назад (чёрный → белый)"
            onClick={peelBack}
            className="z-100 absolute top-0 left-0 w-[170px] h-[170px] select-none pointer-events-auto"
            style={{
              clipPath: "polygon(0% 0%, var(--curl, 28px) 0%, 0% var(--curl, 28px))",
              background:
                "radial-gradient(120px 120px at 0% 0%, rgba(255,255,255,0.15), rgba(255,255,255,0) 60%), linear-gradient(225deg, #141414 40%, #000 65%, #0f0f0f 85%)",
              boxShadow: "inset 6px 6px 10px rgba(255,255,255,0.06), 0 1px 0 rgba(255,255,255,0.05)",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))",
              willChange: "transform",
            }}
          />
        </div>
      )}
    </div>
  );
}
