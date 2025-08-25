// src/app/crypto/BookFlip.tsx
"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { animate } from "framer-motion";
import MainPageClient from "./MainPageClient";
import CryptoLandingClient from "./CryptoLandingClient";

const EASE = [0.26, 0.08, 0.25, 1] as const;
type Dir = "toBlack" | "toWhite" | null;

export default function BookFlip() {
  const router = useRouter();
  const search = useSearchParams();

  const initialFlipped = search?.get("page") === "black"; // true => чёрный активен
  const [flipped, setFlipped] = useState<boolean>(initialFlipped);
  const [animDir, setAnimDir] = useState<Dir>(null);

  const rootRef  = useRef<HTMLDivElement | null>(null);
  const whiteRef = useRef<HTMLDivElement | null>(null);
  const blackRef = useRef<HTMLDivElement | null>(null);

  const [hWhite, setHWhite] = useState(0);
  const [hBlack, setHBlack] = useState(0);

  const measureHeights = () => {
    const vp = typeof window !== "undefined" ? window.innerHeight : 0;
    const w = whiteRef.current?.scrollHeight ?? 0;
    const b = blackRef.current?.scrollHeight ?? 0;

    setHWhite(w);
    setHBlack(b);

    if (!rootRef.current) return;
    const r = rootRef.current.style;
    r.setProperty("--hWhite", `${Math.max(w, vp)}px`);
    r.setProperty("--hBlack", `${Math.max(b, vp)}px`);

    if (!animDir) {
      const active = flipped ? "var(--hBlack)" : "var(--hWhite)";
      r.setProperty("--hFrom", active);
      r.setProperty("--hTo", active);
      r.setProperty("--cut", flipped ? "100%" : "0%");
      r.setProperty("--t", flipped ? "1" : "0");
    }
  };

  useLayoutEffect(() => {
    measureHeights();
    const ro = new ResizeObserver(() => requestAnimationFrame(measureHeights));
    if (whiteRef.current) ro.observe(whiteRef.current);
    if (blackRef.current) ro.observe(blackRef.current);

    const onResize = () => requestAnimationFrame(measureHeights);
    window.addEventListener("resize", onResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animDir, flipped]);

  useEffect(() => {
    router.replace(flipped ? "?page=black" : "?page=white");
  }, [flipped, router]);

  const startFlip = (to: "black" | "white") => {
    if (!rootRef.current) return;
    const r = rootRef.current.style;

    const fromCut = to === "black" ? 0 : 100;
    const toCut   = to === "black" ? 100 : 0;

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
        r.setProperty("--hFrom", to === "black" ? "var(--hBlack)" : "var(--hWhite)");
        r.setProperty("--hTo",   to === "black" ? "var(--hBlack)" : "var(--hWhite)");
        r.setProperty("--cut", to === "black" ? "100%" : "0%");
        r.setProperty("--t",   to === "black" ? "1" : "0");
      },
    });

    return () => controls.stop();
  };

  const peelForward = () => startFlip("black"); // белый → чёрный (угол top-right)
  const peelBack    = () => startFlip("white"); // чёрный → белый (угол top-left)

  // маска всегда на БЕЛОЙ (верхней) странице
  const whiteMask =
    animDir === "toBlack"
      ? "linear-gradient(to bottom left, transparent var(--cut), #fff var(--cut))"    // снимаем от top-right
      : animDir === "toWhite"
      ? "linear-gradient(to bottom right, transparent var(--cut), #fff var(--cut))"   // возвращаем от top-left
      : flipped
      ? "linear-gradient(to bottom left, transparent 100%, #fff 100%)"                // белая полностью снята
      : "linear-gradient(to bottom left, transparent 0%, #fff 0%)";                   // белая целиком

  // показывать уголки
  const showTRonWhite = !flipped || animDir === "toBlack"; // на белой: перелистнуть вперёд
  const showTLonBlack = (flipped && !animDir) || animDir === "toWhite"; // на чёрной: вернуть белую

  return (
    <div
      ref={rootRef}
      className="relative bg-black text-white"
      style={{
        height: "calc((1 - var(--t, 0)) * var(--hFrom, 100vh) + var(--t, 0) * var(--hTo, 100vh))",
        minHeight: "100vh",
        isolation: "isolate",
        overflow: "hidden",
        ["--hFrom" as any]: initialFlipped ? "var(--hBlack)" : "var(--hWhite)",
        ["--hTo"   as any]: initialFlipped ? "var(--hBlack)" : "var(--hWhite)",
        ["--t"     as any]: initialFlipped ? "1" : "0",
        ["--cut"   as any]: initialFlipped ? "100%" : "0%",
      }}
    >
      {/* ЧЁРНАЯ СТРАНИЦА (НИЖНЯЯ) */}
      <div
        className="absolute inset-0 z-10"
        style={{
          transform: "translateZ(0)",
          contain: "paint",
          isolation: "isolate",
          overflow: "hidden",
          pointerEvents: flipped ? "auto" : "none",
        }}
      >
        <div ref={blackRef}>
          <CryptoLandingClient />
        </div>
      </div>

      {/* БЕЛАЯ СТРАНИЦА (ВЕРХНЯЯ, маскируемая) */}
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
          // когда белая полностью снята и нет анимации — можно скрыть визуально,
          // но кнопка для возврата теперь в отдельном оверлее, так что тут не трогаем visibility
          pointerEvents: flipped ? "none" : "auto",
        }}
      >
        <div ref={whiteRef}>
          <MainPageClient />
        </div>

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
            }}
          />
        )}
      </div>

      {/* ОТДЕЛЬНЫЙ ОВЕРЛЕЙ ДЛЯ УГОЛКА НА ЧЁРНОМ (виден, когда чёрный активен) */}
      {showTLonBlack && (
        <div
          className="absolute inset-0 z-30 pointer-events-none"
          aria-hidden={false}
          style={{ isolation: "isolate" }}
        >
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
            }}
          />
        </div>
      )}
    </div>
  );
}
