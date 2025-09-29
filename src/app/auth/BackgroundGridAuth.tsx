"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

/* ---------- Static background (no hooks) ---------- */
function StaticGridBg() {
  return (
    <svg
      className="absolute inset-0 -z-10 h-full w-full pointer-events-none [mask-image:radial-gradient(1200px_800px_at_50%_35%,white,transparent_80%)]"
      viewBox="0 0 1200 800"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="auth-lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f7f7f7" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="1200" height="800" fill="url(#auth-lg)" />
      <g stroke="rgba(0,0,0,0.05)" strokeWidth="1">
        {Array.from({ length: 12 }, (_, i) => (i * 1200) / 11).map((x) => (
          <path key={`v-${x}`} d={`M ${x} 0 L ${x} 800`} />
        ))}
        {Array.from({ length: 8 }, (_, i) => (i * 800) / 7).map((y) => (
          <path key={`h-${y}`} d={`M 0 ${y} L 1200 ${y}`} />
        ))}
      </g>
    </svg>
  );
}

/* ---------- Perf gate (hooks, but never conditional) ---------- */
function useHeavyOK() {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [small, setSmall] = useState(false);
  const [lowPerf, setLowPerf] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const mqCoarse = window.matchMedia("(pointer: coarse)");
    const mqSmall = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setCoarse(mqCoarse.matches);
      setSmall(mqSmall.matches);
      const dm = (navigator as any).deviceMemory ?? 8;
      const hc = navigator.hardwareConcurrency ?? 8;
      setLowPerf(dm <= 4 || hc <= 4);
    };
    update();
    mqCoarse.addEventListener("change", update);
    mqSmall.addEventListener("change", update);
    return () => {
      mqCoarse.removeEventListener("change", update);
      mqSmall.removeEventListener("change", update);
    };
  }, []);

  const heavyOK = mounted && !coarse && !small && !prefersReduced && !lowPerf;
  return { prefersReduced, heavyOK };
}

/* ---------- Animated Aurora (has its own hooks, mounted/unmounted as a whole) ---------- */
function AuroraSVG({
  x, y, reduced,
}: {
  x: ReturnType<typeof useSpring>;
  y: ReturnType<typeof useSpring>;
  reduced: boolean;
}) {
  // NOTE: hooks are always called when this component is mounted
  const g1x = useTransform(x, (v) => v * 1.6);
  const g1y = useTransform(y, (v) => v * 1.6);
  const g2x = useTransform(x, (v) => v * -1.0);
  const g2y = useTransform(y, (v) => v * -1.0);

  const grid = useMemo(() => {
    const vs = Array.from({ length: 12 }, (_, i) => (i * 1200) / 11);
    const hs = Array.from({ length: 8 }, (_, i) => (i * 800) / 7);
    return { vs, hs };
  }, []);

  return (
    <svg
      className="absolute inset-0 z-10 h-full w-full pointer-events-none [mask-image:radial-gradient(1200px_800px_at_50%_35%,white,transparent_80%)]"
      viewBox="0 0 1200 800"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id="auth-g1" cx="15%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#bfdbfe" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="auth-g2" cx="85%" cy="15%" r="80%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#fecaca" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <filter id="auth-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="10" edgeMode="duplicate" />
        </filter>
        {!reduced && (
          <style>{`
            .aurora { transform-origin: 50% 50%; will-change: transform, opacity; }
            .a1 { animation: authPulse1 16s ease-in-out infinite; }
            .a2 { animation: authPulse2 18s ease-in-out infinite; }
            @keyframes authPulse1 { 0%{opacity:.55; transform:scale(1)} 50%{opacity:.7; transform:scale(1.03)} 100%{opacity:.55; transform:scale(1)} }
            @keyframes authPulse2 { 0%{opacity:.45; transform:scale(.98)} 50%{opacity:.6; transform:scale(1.02)} 100%{opacity:.45; transform:scale(.98)} }
          `}</style>
        )}
      </defs>

      <motion.g style={{ x: g1x, y: g1y }}>
        <path
          d="M 0 520 C 220 540 360 380 600 420 C 840 460 980 320 1200 340 L 1200 800 L 0 800 Z"
          fill="url(#auth-g1)"
          filter="url(#auth-soft)"
          className="aurora a1"
        />
      </motion.g>
      <motion.g style={{ x: g2x, y: g2y }}>
        <circle
          cx="900"
          cy="640"
          r="300"
          fill="url(#auth-g2)"
          filter="url(#auth-soft)"
          className="aurora a2"
        />
      </motion.g>

      <g stroke="rgba(0,0,0,0.05)" strokeWidth="1">
        {grid.vs.map((x) => <path key={`v-${x}`} d={`M ${x} 0 L ${x} 800`} />)}
        {grid.hs.map((y) => <path key={`h-${y}`} d={`M 0 ${y} L 1200 ${y}`} />)}
      </g>
    </svg>
  );
}

/* ---------- Host component (NO conditional hooks) ---------- */
export default function BackgroundGridAuth() {
  const { prefersReduced, heavyOK } = useHeavyOK();

  // Motion hooks: ALWAYS called
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tiltX = useSpring(mx, { stiffness: 80, damping: 15, mass: 0.3 });
  const tiltY = useSpring(my, { stiffness: 80, damping: 15, mass: 0.3 });

  // Precompute transforms UNCONDITIONALLY (do NOT call hooks in JSX/conditions)
  const glare1X = useTransform(tiltX, (v) => v * 2);
  const glare1Y = useTransform(tiltY, (v) => v * 2);
  const glare2X = useTransform(tiltX, (v) => v * -2);
  const glare2Y = useTransform(tiltY, (v) => v * -2);

  const hostRef = useRef<HTMLDivElement | null>(null);

  // Pointer listeners only when heavyOK (no hooks inside condition)
  useEffect(() => {
    if (!heavyOK || prefersReduced) return;
    const el = hostRef.current ?? document.body;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const rect = hostRef.current?.getBoundingClientRect();
      const w = rect?.width ?? window.innerWidth;
      const h = rect?.height ?? window.innerHeight;
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      const x = ((e.clientX - left) / w - 0.5) * 10;
      const y = ((e.clientY - top) / h - 0.5) * -10;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          mx.set(x);
          my.set(y);
          raf = 0;
        });
      }
    };
    const onLeave = () => {
      if (!raf) {
        raf = requestAnimationFrame(() => {
          mx.set(0);
          my.set(0);
          raf = 0;
        });
      }
    };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      el.removeEventListener("pointermove", onMove as any);
      el.removeEventListener("pointerleave", onLeave as any);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mx, my, heavyOK, prefersReduced]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="absolute inset-0 z-10 overflow-hidden pointer-events-none [contain:layout_paint]"
    >
      {heavyOK ? (
        <AuroraSVG x={tiltX} y={tiltY} reduced={!!prefersReduced} />
      ) : (
        <StaticGridBg />
      )}

      {heavyOK && !prefersReduced && (
        <>
          <motion.div
            className="absolute inset-0 m-auto h-[420px] w-[420px] rounded-full bg-white/30 blur-3xl will-change-transform"
            style={{ x: glare1X, y: glare1Y }}
          />
          <motion.div
            className="absolute right-6 top-1/3 h-[360px] w-[360px] rounded-full bg-neutral-100/60 blur-2xl will-change-transform"
            style={{ x: glare2X, y: glare2Y }}
          />
        </>
      )}
    </div>
  );
}
