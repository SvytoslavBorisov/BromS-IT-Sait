"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

/** ---------- Векторная математика ---------- */
type Vec = { x: number; y: number };
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const len = (a: Vec) => Math.hypot(a.x, a.y);
const norm = (a: Vec): Vec => { const L = len(a) || 1; return { x: a.x / L, y: a.y / L }; };
const det = (a: Vec, b: Vec) => a.x * b.y - a.y * b.x;
const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (radVal: number) => (radVal * 180) / Math.PI;

/** ---------- Цвета ---------- */
const C = { R: 1, G: 2, B: 4 } as const;
const maskToHex = (m: number) => {
  const r = (m & C.R) ? 255 : 0, g = (m & C.G) ? 255 : 0, b = (m & C.B) ? 255 : 0;
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
};

/** ---------- Пересечения ---------- */
function intersectRaySegment(O: Vec, d: Vec, A: Vec, B: Vec): { t: number; P: Vec; u: number } | null {
  const v = sub(B, A); const den = det(d, v);
  if (Math.abs(den) < 1e-9) return null;
  const AO = sub(A, O);
  const t = det(AO, v) / den;
  const u = det(AO, d) / den;
  if (t >= 0 && u >= 0 && u <= 1) return { t, P: add(O, mul(d, t)), u };
  return null;
}
function intersectRayCircle(O: Vec, d: Vec, Cc: Vec, r: number): { t: number; P: Vec } | null {
  const oc = sub(O, Cc);
  const b = 2 * dot(d, oc);
  const c = dot(oc, oc) - r * r;
  const D = b * b - 4 * c;
  if (D < 0) return null;
  const sD = Math.sqrt(D);
  const t1 = (-b - sD) / 2, t2 = (-b + sD) / 2;
  const t = (t1 >= 1e-6) ? t1 : (t2 >= 1e-6 ? t2 : -1);
  if (t < 0) return null;
  return { t, P: add(O, mul(d, t)) };
}
function reflectDir(d: Vec, A: Vec, B: Vec): Vec {
  const m = norm(sub(B, A));
  const proj2 = mul(m, 2 * dot(d, m));
  return norm(sub(proj2, d));
}

/** ---------- Типы ---------- */
type SegmentObj = { kind: "wall" | "mirror"; A: Vec; B: Vec };
type CircleObj  = { id: string; kind: "filter" | "goal" | "decoy"; C: Vec; r: number; mask?: number; requiredMask?: number };
type RaySeg = { A: Vec; B: Vec; mask: number };

/** ---------- Компонент ---------- */
export default function LightBeams360() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 1280, h: 720 });

  /** Источник — позиция в процентах; угол поворачивается мышью */
  const [sourcePct]   = useState<Vec>({ x: 0.12, y: 0.78 });
  const [sourceDeg, setSourceDeg] = useState<number>(9);
  const [drag, setDrag] = useState<
    | { type: "none" }
    | { type: "srcRot" }
    | { type: "mirrorRot" }
    | { type: "filterMove"; id: string }
    | { type: "mirrorMove"; idx: number }
  >({ type: "none" });

  /** Главный зеркало: позиция/длина/угол. Поворот — мышью по клику, перенос — drag. */
  const [mirrorCenterPct, setMirrorCenterPct] = useState<Vec>({ x: 0.46, y: 0.52 });
  const [mirrorDeg, setMirrorDeg] = useState<number>(-20);
  const mirrorLenPct = 0.24;

  /** Доп. зеркала (обманки) — можно таскать. */
  const [extraMirrorsPct, setExtraMirrorsPct] = useState<{ center: Vec; lenPct: number; deg: number }[]>([
    { center: { x: 0.28, y: 0.35 }, lenPct: 0.14, deg: 42 },
    { center: { x: 0.78, y: 0.72 }, lenPct: 0.18, deg: -30 },
  ]);

  /** Фильтры/цель/обманки — теперь стейт (можно таскать фильтры). */
  const [circlesPct, setCirclesPct] = useState<CircleObj[]>([
    { id:"R", kind: "filter", C: { x: 0.33, y: 0.63 }, r: 0.032, mask: C.R },
    { id:"B", kind: "filter", C: { x: 0.64, y: 0.37 }, r: 0.032, mask: C.B },
    { id:"D", kind: "decoy",  C: { x: 0.46, y: 0.75 }, r: 0.030, mask: C.G }, // визуальная обманка
    { id:"G", kind: "goal",   C: { x: 0.88, y: 0.18 }, r: 0.036, requiredMask: C.R | C.B },
  ]);

  /** Кино-режим: bloom + «псевдо-DOF» */
  const [cinema, setCinema] = useState<boolean>(true);

  /** Walls: рамка + коридоры (фиксированные) */
  const innerWallsPct: SegmentObj[] = useMemo(() => ([
    { kind: "wall", A: { x: 0.18, y: 0.86 }, B: { x: 0.82, y: 0.86 } },
    { kind: "wall", A: { x: 0.18, y: 0.22 }, B: { x: 0.58, y: 0.22 } },
  ]), []);

  /** ---------- Resize ---------- */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(640, r.width), h: Math.max(420, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** ---------- Хелперы процентов/пикселей ---------- */
  const toPx = (p: Vec): Vec => ({ x: p.x * size.w, y: p.y * size.h });
  const toPct = (p: Vec): Vec => ({ x: p.x / size.w, y: p.y / size.h });
  const minSide = Math.min(size.w, size.h);

  /** ---------- Геометрия уровня (мемо) ---------- */
  // Рамка
  const frameWalls: SegmentObj[] = useMemo(() => {
    const p0 = { x: 0.02, y: 0.04 }, p1 = { x: 0.98, y: 0.96 };
    const A = toPx({ x: p0.x, y: p0.y });
    const B = toPx({ x: p1.x, y: p0.y });
    const Cc = toPx({ x: p1.x, y: p1.y });
    const D = toPx({ x: p0.x, y: p1.y });
    return [
      { kind: "wall", A, B },
      { kind: "wall", A: B, B: Cc },
      { kind: "wall", A: Cc, B: D },
      { kind: "wall", A: D, B: A },
    ];
  }, [size.w, size.h]);

  // Полный список стен
  const wallsPx: SegmentObj[] = useMemo(
    () => [
      ...frameWalls,
      ...innerWallsPct.map(s => ({ kind: "wall" as const, A: toPx(s.A), B: toPx(s.B) })),
    ],
    [frameWalls, innerWallsPct, size.w, size.h]
  );

  // Круги
  const circlesPx: CircleObj[] = useMemo(
    () => circlesPct.map(c => ({ ...c, C: toPx(c.C), r: c.r * minSide })),
    [circlesPct, minSide, size.w, size.h]
  );

  // Источник / направление
  const sourcePx = useMemo(() => toPx(sourcePct), [sourcePct.x, sourcePct.y, size.w, size.h]);
  const srcDir: Vec = useMemo(() => {
    const a = rad(sourceDeg);
    return { x: Math.cos(a), y: Math.sin(a) };
  }, [sourceDeg]);

  // Главное зеркало
  const mirrorCenterPx = useMemo(() => toPx(mirrorCenterPct), [mirrorCenterPct.x, mirrorCenterPct.y, size.w, size.h]);
  const mirrorMainPx: SegmentObj = useMemo(() => {
    const halfLen = mirrorLenPct * size.w * 0.5;
    const a = rad(mirrorDeg);
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    return {
      kind: "mirror",
      A: { x: mirrorCenterPx.x - dir.x * halfLen, y: mirrorCenterPx.y - dir.y * halfLen },
      B: { x: mirrorCenterPx.x + dir.x * halfLen, y: mirrorCenterPx.y + dir.y * halfLen },
    };
  }, [mirrorCenterPx.x, mirrorCenterPx.y, mirrorDeg, size.w]);

  // Доп. зеркала
  const extraMirrorsPx: SegmentObj[] = useMemo(() => {
    return extraMirrorsPct.map(m => {
      const c = toPx(m.center);
      const half = m.lenPct * size.w * 0.5;
      const a = rad(m.deg);
      const d = { x: Math.cos(a), y: Math.sin(a) };
      return { kind: "mirror" as const, A: { x: c.x - d.x * half, y: c.y - d.y * half }, B: { x: c.x + d.x * half, y: c.y + d.y * half } };
    });
  }, [extraMirrorsPct, size.w, size.h]);

  /** ---------- Трассировка луча ---------- */
  const [raySegs, setRaySegs] = useState<RaySeg[]>([]);
  const [win, setWin] = useState<boolean>(false);
  const [sparks, setSparks] = useState<{ x: number; y: number; col: number }[]>([]);

  useEffect(() => {
    const eps = Math.max(0.001 * minSide, 0.75);
    let O = { ...sourcePx };
    let d = norm(srcDir);
    let mask = 0;                        // НАКАПЛИВАЕМ маску (R|G|B) — визуализация будет ЕДИНЫМ цветом
    const segs: RaySeg[] = [];
    const fx: { x: number; y: number; col: number }[] = [];

    for (let bounce = 0; bounce < 40; bounce++) {
      let bestT = Infinity;
      let hitSeg: SegmentObj | null = null;
      let hitCircle: CircleObj | null = null;
      let hitPoint: Vec | null = null;

      // стены + все зеркала
      const segObjs: SegmentObj[] = [...wallsPx, mirrorMainPx, ...extraMirrorsPx];
      for (const s of segObjs) {
        const isect = intersectRaySegment(O, d, s.A, s.B);
        if (isect && isect.t < bestT) { bestT = isect.t; hitSeg = s; hitCircle = null; hitPoint = isect.P; }
      }
      // круги
      for (const c of circlesPx) {
        const isect = intersectRayCircle(O, d, c.C, c.r);
        if (isect && isect.t < bestT) { bestT = isect.t; hitCircle = c; hitSeg = null; hitPoint = isect.P; }
      }

      if (!hitPoint || !isFinite(bestT)) {
        const far = add(O, mul(d, 5000));
        segs.push({ A: O, B: far, mask });
        break;
      }

      segs.push({ A: O, B: hitPoint, mask });

      if (hitCircle) {
        if (hitCircle.kind === "goal") {
          const req = hitCircle.requiredMask ?? 0;
          fx.push({ x: hitPoint.x, y: hitPoint.y, col: mask });
          setRaySegs(segs);
          setSparks(fx);
          setWin(mask === req);
          return;
        }
        if (hitCircle.kind === "filter") {
          mask = mask | (hitCircle.mask ?? 0);      // ← комбинируем цвет (R|G|B)
          fx.push({ x: hitPoint.x, y: hitPoint.y, col: mask });
          O = add(hitPoint, mul(d, eps));
          continue;
        }
        if (hitCircle.kind === "decoy") {
          fx.push({ x: hitPoint.x, y: hitPoint.y, col: hitCircle.mask ?? 0 });
          O = add(hitPoint, mul(d, eps));
          continue;
        }
      } else if (hitSeg) {
        if (hitSeg.kind === "wall") {
          setRaySegs(segs);
          setSparks(fx);
          setWin(false);
          return;
        }
        if (hitSeg.kind === "mirror") {
          fx.push({ x: hitPoint.x, y: hitPoint.y, col: mask });
          d = reflectDir(d, hitSeg.A, hitSeg.B);
          O = add(hitPoint, mul(d, eps));
          continue;
        }
      }
    }

    setRaySegs(segs);
    setSparks(fx);
    setWin(false);
  }, [wallsPx, circlesPx, mirrorMainPx, extraMirrorsPx, sourcePx, srcDir, minSide]);

  /** ---------- Глобальный mousemove/up для всех режимов перетаскивания/поворота ---------- */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (drag.type === "none") return;
      const rect = wrapRef.current?.getBoundingClientRect(); if (!rect) return;
      const px = e.clientX - rect.left, py = e.clientY - rect.top;

      if (drag.type === "srcRot") {
        const v = { x: px - sourcePx.x, y: py - sourcePx.y };
        setSourceDeg(deg(Math.atan2(v.y, v.x)));
      } else if (drag.type === "mirrorRot") {
        const v = { x: px - mirrorCenterPx.x, y: py - mirrorCenterPx.y };
        setMirrorDeg(deg(Math.atan2(v.y, v.x)));
      } else if (drag.type === "filterMove") {
        const p = toPct({ x: px, y: py });
        setCirclesPct(prev => prev.map(c => c.id === drag.type === "filterMove" && (drag as any).id === c.id ? { ...c, C: clampPct(p) } : c));
      } else if (drag.type === "mirrorMove") {
        setExtraMirrorsPct(prev => prev.map((m, idx) => idx === drag.idx ? { ...m, center: clampPct(toPct({ x: px, y: py })) } : m));
        // главный зеркало перетаскиваем, если idx === -1 (используем соглашение)
      }
    };
    const onUp = () => setDrag({ type: "none" });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [drag, mirrorCenterPx.x, mirrorCenterPx.y, sourcePx.x, sourcePx.y, size.w, size.h]);

  const clampPct = (p: Vec): Vec => ({ x: Math.max(0.04, Math.min(0.96, p.x)), y: Math.max(0.06, Math.min(0.94, p.y)) });

  /** ---------- Частицы фона ---------- */
  const particles = useMemo(() => {
    return Array.from({ length: 90 }).map(() => ({
      x: Math.random(), y: Math.random(), r: 0.7 + Math.random() * 2.2,
      dur: 18 + Math.random() * 22, delay: Math.random() * 10
    }));
  }, []);

  /** ---------- Рендер ---------- */
  const goalPx = circlesPx.find(c => c.kind === "goal")!;
  const dofFilterFor = (p: Vec) => {
    if (!cinema) return undefined;
    const d = Math.hypot(p.x - goalPx.C.x, p.y - goalPx.C.y);
    const R = Math.max(size.w, size.h);
    if (d < R * 0.18) return "url(#dofNear)";
    if (d < R * 0.38) return "url(#dofMid)";
    return "url(#dofFar)";
  };

  return (
    <div
      ref={wrapRef}
      style={{
        width: "100vw", height: "100vh", position: "relative", overflow: "hidden",
        background: "conic-gradient(from 200deg at 20% 70%, #0b0f16, #0f1320 30%, #0b101a 55%, #0b0f16)",
        color: "#e6edf3", fontFamily: "Inter, system-ui, Segoe UI, Roboto, Arial, sans-serif",
      }}
    >
      <style>{`
        @keyframes floatY { from { transform: translateY(0px) } to { transform: translateY(-80px) } }
        @keyframes tw { 0%{opacity: .15} 50%{opacity:.45} 100%{opacity:.15} }
        @keyframes auroraShift { 0%{ transform: translateX(-8%) } 50%{ transform: translateX(8%) } 100%{ transform: translateX(-8%) } }
        @keyframes grain { 0%{transform:translate(0,0)} 100%{transform:translate(-10%, -10%)} }
      `}</style>

      {/* Аура/небулы */}
      <div style={{
        position: "absolute", inset: "-10% -20% -10% -20%", filter: "blur(60px)", opacity: cinema ? 0.6 : 0.45,
        background: "radial-gradient(40% 35% at 30% 70%, #2b2345, rgba(0,0,0,0)), radial-gradient(35% 30% at 70% 30%, #183d60, rgba(0,0,0,0)), radial-gradient(28% 25% at 60% 80%, #3d1444, rgba(0,0,0,0))",
        mixBlendMode: "screen",
        transform: "translateZ(0)",
        animation: "auroraShift 16s ease-in-out infinite",
      }} />

      {/* Виньетка и плёночный шум */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(120% 100% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,.45) 100%)",
        mixBlendMode: "multiply"
      }} />
      <div style={{
        position: "absolute", inset: 0, opacity: .07, pointerEvents: "none",
        backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"2\" stitchTiles=\"stitch\"/></filter><rect width=\"100%\" height=\"100%\" filter=\"url(%23n)\" opacity=\"0.35\"></rect></svg>')",
        backgroundSize: "240px 240px",
        animation: "grain 18s linear infinite"
      }} />

      {/* HUD */}
      <div style={{
        position: "absolute", top: 16, left: 16, padding: "10px 12px",
        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12, backdropFilter: "blur(8px)", boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}>
        <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>Light Beams 360 — неон-демо</div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>
          Проведите через <b style={{ color: maskToHex(C.R) }}>R</b> и <b style={{ color: maskToHex(C.B) }}>B</b>. Зелёный круг — обманка.
        </div>
      </div>

      {/* Статус + настройки */}
      <div style={{
        position: "absolute", top: 16, right: 16, padding: "10px 12px",
        background: win ? "rgba(46,160,67,.15)" : "rgba(255,193,7,.12)",
        border: `1px solid ${win ? "rgba(46,160,67,.6)" : "rgba(255,193,7,.5)"}`,
        borderRadius: 12, backdropFilter: "blur(8px)", fontWeight: 700,
        color: win ? "#3fb950" : "#ffda6a", display:"flex", gap:12, alignItems:"center"
      }}>
        <span>{win ? "✅ Пурпурный достиг цели!" : "Подберите угол источника и зеркала…"}</span>
        <label style={{ display:"inline-flex", gap:6, alignItems:"center", fontWeight:600, cursor:"pointer" }}>
          <input type="checkbox" checked={cinema} onChange={e => setCinema(e.target.checked)} />
          Кинорежим
        </label>
      </div>

      {/* Фоновая пыль */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {particles.map((p, i) => (
          <circle key={i}
                  cx={`${p.x * 100}%`} cy={`${p.y * 100}%`} r={p.r}
                  fill="rgba(255,255,255,.16)" style={{
                    filter: "blur(0.4px)", animation: `floatY ${p.dur}s ease-in-out ${p.delay}s infinite, tw ${p.dur * .8}s ease-in-out ${p.delay/2}s infinite`
                  }}/>
        ))}
      </svg>

      {/* Игровой холст */}
      <svg
        width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}
      >
        {/* Defs */}
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          </pattern>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="beamGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="8" result="b1"/><feGaussianBlur stdDeviation="16" result="b2"/>
            <feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="beamGlowHard" x="-90%" y="-90%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="12" result="b1"/><feGaussianBlur stdDeviation="24" result="b2"/>
            <feMerge><feMergeNode in="b2"/><feMergeNode in="b1"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="star" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Псевдо-DOF: три уровня */}
          <filter id="dofNear"><feGaussianBlur stdDeviation="0.6"/></filter>
          <filter id="dofMid"><feGaussianBlur stdDeviation="1.8"/></filter>
          <filter id="dofFar"><feGaussianBlur stdDeviation="3.2"/></filter>
        </defs>

        {/* Сетка-фон */}
        <rect x={0} y={0} width={size.w} height={size.h} fill="url(#grid)" />

        {/* Рамка-стены */}
        {[...wallsPx.slice(0,4)].map((s, i) => (
          <line key={`frame-${i}`} x1={s.A.x} y1={s.A.y} x2={s.B.x} y2={s.B.y}
                stroke="rgba(255,255,255,0.35)" strokeWidth={5} strokeLinecap="round"
                filter={cinema ? "url(#glow)" : undefined}/>
        ))}

        {/* Внутренние стены */}
        {wallsPx.slice(4).map((s, i) => (
          <line key={`wall-${i}`} x1={s.A.x} y1={s.A.y} x2={s.B.x} y2={s.B.y}
                stroke="rgba(210,220,255,0.24)" strokeWidth={5} strokeLinecap="round"
                filter={cinema ? dofFilterFor(s.A) : undefined}/>
        ))}

        {/* Главное зеркало: drag для перемещения, клик-drag для поворота */}
        <g
          onMouseDown={(e) => {
            e.preventDefault();
            if (e.shiftKey) {
              setDrag({ type: "mirrorMove", idx: -1 }); // перенос центра при Shift
            } else {
              setDrag({ type: "mirrorRot" });          // поворот по умолчанию
            }
          }}
          onDoubleClick={(e) => { // быстрый перенос без шифта
            e.preventDefault();
            setDrag({ type: "mirrorMove", idx: -1 });
          }}
          style={{ cursor: "grab" }}
        >
          <line x1={mirrorMainPx.A.x} y1={mirrorMainPx.A.y} x2={mirrorMainPx.B.x} y2={mirrorMainPx.B.y}
                stroke="#7cd6ff" strokeWidth={7} strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 8px rgba(124,214,255,.7)) ${cinema ? "" : ""}` }}/>
          <circle cx={mirrorCenterPx.x} cy={mirrorCenterPx.y} r={9} fill="#7cd6ff" opacity={0.95}/>
        </g>

        {/* Если перенос главного зеркала активен — центр следует за мышью */}
        {/* обновляем центр, когда drag == mirrorMove и idx == -1 */}
        {drag.type === "mirrorMove" && (drag as any).idx === -1 && (
          <UpdatingCenter centerPx={mirrorCenterPx} setCenterPct={setMirrorCenterPct} toPct={toPct}/>
        )}

        {/* Доп. зеркала — перетаскиваются (перемещение), угол фиксированный */}
        {extraMirrorsPx.map((m, i) => (
          <g key={`xm-${i}`} onMouseDown={(e) => { e.preventDefault(); setDrag({ type: "mirrorMove", idx: i }); }} style={{ cursor: "grab" }}>
            <line x1={m.A.x} y1={m.A.y} x2={m.B.x} y2={m.B.y}
                  stroke="#5bc0ff" strokeWidth={6} strokeLinecap="round" opacity={0.6}
                  style={{ filter: "drop-shadow(0 0 8px rgba(91,192,255,.55))" }}/>
          </g>
        ))}

        {/* Фильтры/обманки — перетаскиваем кружки */}
        {circlesPx.filter(c => c.kind !== "goal").map((c) => {
          const col = c.kind === "filter" ? maskToHex(c.mask ?? 0) : "#59ff7a";
          const op  = c.kind === "filter" ? 0.24 : 0.18;
          return (
            <g key={c.id}
               onMouseDown={(e) => { e.preventDefault(); setDrag({ type: "filterMove", id: c.id }); }}
               style={{ cursor: "grab" }} filter={cinema ? dofFilterFor(c.C) : undefined}
            >
              <circle cx={c.C.x} cy={c.C.y} r={c.r} fill={col} opacity={op} stroke={col} strokeWidth={2}/>
              <circle cx={c.C.x} cy={c.C.y} r={c.r * .35} fill={col} opacity={0.22}/>
            </g>
          );
        })}

        {/* Цель */}
        {(() => {
          const goal = goalPx;
          const req = (goal.requiredMask ?? 0);
          return (
            <g filter={cinema ? "url(#glow)" : undefined}>
              <circle cx={goal.C.x} cy={goal.C.y} r={goal.r}
                      fill="none" stroke={maskToHex(req)} strokeWidth={cinema ? 6 : 4}/>
              <circle cx={goal.C.x} cy={goal.C.y} r={goal.r * .25}
                      fill={maskToHex(req)} opacity={.18}/>
              <text x={goal.C.x} y={goal.C.y + 5} textAnchor="middle"
                    fontSize={12} fill={maskToHex(req)} style={{ fontWeight: 800 }}>
                GOAL
              </text>
            </g>
          );
        })()}

        {/* ЛУЧ: теперь ОДИН составной цвет = maskToHex(mask) (никаких наложений R/G/B поверх!) */}
        {raySegs.map((s, i) => {
          const col = s.mask === 0 ? "rgba(255,255,255,.22)" : maskToHex(s.mask);
          return (
            <g key={`r-${i}`}>
              <line x1={s.A.x} y1={s.A.y} x2={s.B.x} y2={s.B.y}
                    stroke={col} strokeWidth={cinema ? 8 : 6} strokeLinecap="round" opacity={0.95}
                    filter={cinema ? "url(#beamGlowHard)" : "url(#beamGlow)"} />
              {/* «горячее» белое ядро в центре луча для сочности */}
              {s.mask !== 0 && (
                <line x1={s.A.x} y1={s.A.y} x2={s.B.x} y2={s.B.y}
                      stroke="#ffffff" strokeWidth={cinema ? 3.5 : 3} strokeLinecap="round" opacity={0.9} />
              )}
            </g>
          );
        })}

        {/* Вспышки на событиях */}
        {sparks.map((p, i) => (
          <g key={`sp-${i}`} filter="url(#star)">
            <circle cx={p.x} cy={p.y} r={8} fill={p.col ? maskToHex(p.col) : "#ffffff"} opacity={0.55}/>
            <circle cx={p.x} cy={p.y} r={18} fill={p.col ? maskToHex(p.col) : "#ffffff"} opacity={0.12}/>
          </g>
        ))}

        {/* Источник: клик-drag = поворот */}
        <g onMouseDown={(e) => { e.preventDefault(); setDrag({ type: "srcRot" }); }} style={{ cursor: "grab" }}>
          <circle cx={sourcePx.x} cy={sourcePx.y} r={13} fill="#ffffff" />
          <line x1={sourcePx.x} y1={sourcePx.y}
                x2={sourcePx.x + srcDir.x * 34} y2={sourcePx.y + srcDir.y * 34}
                stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

/** Вспомогательный «компонент-петля»: когда активен перенос главного зеркала, обновляет центр в процентах */
function UpdatingCenter({ centerPx, setCenterPct, toPct }:{
  centerPx: Vec; setCenterPct: (v: Vec) => void; toPct: (v: Vec) => Vec
}) {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const root = (e.currentTarget as any) ?? window;
      // Ничего не делаем здесь. Центр обновляется в основном effect onMove.
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  // Синхронизация центра (привязываем к текущей позиции мыши в основном эффекте)
  useEffect(() => { setCenterPct(toPct(centerPx)); }, [centerPx.x, centerPx.y]); // однократно на кадр
  return null;
}
