// luch/canvas/GameCanvas.tsx
"use client";

import React, { useRef, useState } from "react";
import {
  CircleObj, SegmentObj, MirrorSpec, InventoryItem, maskToHex,
} from "../engine/types";
import { MAX_BOUNCES } from "../engine/constants";
import { clampPct, pointKey, toPct, norm } from "../engine/utils";
import { useCanvasSize } from "./hooks/useCanvasSize";
import { useGeometry } from "./hooks/useGeometry";
import { useTrace } from "./hooks/useTrace";
import { useDragHandlers, DragState } from "./hooks/useDragHandlers";

import { GridAndFiltersDefs } from "./primitives/GridAndFiltersDefs";
import { Walls } from "./render/Walls";
import { Mirrors } from "./render/Mirrors";
import { Circles } from "./render/Circles";
import { Beams } from "./render/Beams";
import { Source } from "./render/Source";

type Props = Readonly<{
  compact: boolean;

  // источник
  sourcePct: { x: number; y: number };
  sourceDeg: number;
  setSourceDeg: (d: number) => void;

  // зеркала уровня
  mainMirror: MirrorSpec;
  setMainMirror: (m: MirrorSpec) => void;
  extraMirrorsPct: MirrorSpec[];
  setExtraMirrorsPct: (m: MirrorSpec[]) => void;

  // окружение
  frameWallsPct: SegmentObj[];
  innerWallsPct: SegmentObj[];

  // круги
  circlesPct: CircleObj[];
  setCirclesPct: (c: CircleObj[]) => void;

  // установленные игроком отражатели
  placedReflectorsPct: SegmentObj[];
  setPlacedReflectorsPct: (m: SegmentObj[]) => void;

  // установка из инвентаря
  placeMode: InventoryItem["kind"] | null;
  setPlaceMode: (k: InventoryItem["kind"] | null) => void;
  placeReflector: (
    kind: InventoryItem["kind"],
    A_pct: { x: number; y: number },
    B_pct: { x: number; y: number }
  ) => void;

  // drag фильтров
  updateFilterPos: (id: string, newPct: { x: number; y: number }) => void;

  // внешние действия над зеркалами уровня
  rotateById: (id: string, deltaDeg: number) => void;
  moveMirrorById: (id: string, c: { x: number; y: number }) => void;

  // НОВОЕ: действия над размещёнными отражателями (из инвентаря)
  movePlacedById: (id: string, c: { x: number; y: number }) => void;
  rotatePlacedById: (id: string, deltaDeg: number) => void;
}>;

export default function GameCanvas({
  compact,
  sourcePct, sourceDeg, setSourceDeg,
  mainMirror, extraMirrorsPct,
  frameWallsPct, innerWallsPct,
  circlesPct,
  placedReflectorsPct,
  placeMode, setPlaceMode, placeReflector,
  updateFilterPos, rotateById, moveMirrorById,
  setMainMirror: _setMainMirror,
  setExtraMirrorsPct: _setExtraMirrorsPct,
  setCirclesPct: _setCirclesPct,
  setPlacedReflectorsPct: _setPlacedReflectorsPct,
  movePlacedById,
  rotatePlacedById,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const aspect = compact ? 3 / 4 : 16 / 9;
  const size = useCanvasSize(wrapRef, aspect);

  // Геометрия (px) и производные
  const geo = useGeometry({
    size, sourcePct, sourceDeg, mainMirror, extraMirrorsPct,
    frameWallsPct, innerWallsPct, circlesPct, placedReflectorsPct,
  });

  // Трассировка (мемо) — без лишних перерисовок
  const trace = useTrace({
    size, sourcePx: geo.sourcePx, srcDir: norm(geo.srcDir),
    wallsPx: geo.wallsPx, mirrorsPx: geo.mirrorsAllPx,
    circlesPx: geo.circlesPx, placedReflectorsPx: geo.placedReflectorsPx,
    mirrorMainPx: geo.mirrorMainPx, extraMirrorsPx: geo.extraMirrorsPx,
    maxBounces: MAX_BOUNCES,
  });

  // DRAG + установка/перемещение
  const [drag, setDrag] = useState<DragState>({ type: "none" });
  useDragHandlers({
    wrapRef, drag, setDrag,
    size,
    sourcePx: geo.sourcePx,
    mainMirror, extraMirrorsPct,
    setSourceDeg, rotateById, moveMirrorById, updateFilterPos,
  });

  // ==== hit-test и drag размещённых отражателей ====
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const DRAG_TOL = 1.2; // в процентах — толщина «подхвата» отрезка

  function distPointToSeg(
    p: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number }
  ) {
    const vx = b.x - a.x, vy = b.y - a.y;
    const wx = p.x - a.x, wy = p.y - a.y;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y);
    const t = c1 / c2;
    const proj = { x: a.x + t * vx, y: a.y + t * vy };
    return Math.hypot(p.x - proj.x, p.y - proj.y);
  }

  function hitPlaced(pxPct: number, pyPct: number) {
    for (const s of placedReflectorsPct) {
      if (distPointToSeg({ x: pxPct, y: pyPct }, s.A, s.B) <= DRAG_TOL) return s.id;
    }
    return null;
  }

  // ОБЪЕДИНЁННЫЙ onPointerDown: либо ставим предмет, либо выбираем размещённый
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();

    // нормированные координаты в % (по viewBox 0..size.w, 0..size.h → 100 x 56.25)
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * (100 * size.h / size.w);

    // 1) Если выбран режим установки — ставим отражатель и выходим
    if (placeMode) {
      const atPx = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      const v = { x: atPx.x - geo.sourcePx.x, y: atPx.y - geo.sourcePx.y };
      const dir = norm(v.x === 0 && v.y === 0 ? { x: 1, y: 0 } : v);
      const lenPct = placeMode === "reflector_long" ? 0.2 : 0.12;
      const halfPx = lenPct * size.w * 0.5;
      const Apx = { x: atPx.x - dir.x * halfPx, y: atPx.y - dir.y * halfPx };
      const Bpx = { x: atPx.x + dir.x * halfPx, y: atPx.y + dir.y * halfPx };

      const A_pct = clampPct(toPct(Apx, size.w, size.h));
      const B_pct = clampPct(toPct(Bpx, size.w, size.h));
      placeReflector(placeMode, A_pct, B_pct);
      setPlaceMode(null);
      return;
    }

    // 2) Иначе — пытаемся подхватить уже размещённый
    const id = hitPlaced(xPct, yPct);
    setSelectedId(id);
    if (id) (svg as any).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!selectedId) return;
    const svg = e.currentTarget;
    const r = svg.getBoundingClientRect();
    const xPct = ((e.clientX - r.left) / r.width) * 100;
    const yPct = ((e.clientY - r.top) / r.height) * (100 * size.h / size.w);
    movePlacedById(selectedId, { x: xPct, y: yPct });
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    setSelectedId(null);
    const svg = e.currentTarget;
    (svg as any).releasePointerCapture?.(e.pointerId);
  }

  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    if (!selectedId) return;
    e.preventDefault();
    const step = e.deltaY < 0 ? +5 : -5; // градусы
    rotatePlacedById(selectedId, step);
  }

  return (
    <div ref={wrapRef}>
      <svg
        width="100%"
        height={Math.round(size.h)}
        viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ display: "block", borderRadius: 12, background: "#0c1120" }} // тёмный фон сцены
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      >
        {/* Атмосферный фон и виньетка (дешёвые градиенты) */}
        <defs>
          <radialGradient id="bgNebula" cx="20%" cy="0%" r="90%">
            <stop offset="0%" stopColor="rgba(124,214,255,0.22)" />
            <stop offset="50%" stopColor="rgba(124,214,255,0.10)" />
            <stop offset="100%" stopColor="rgba(12,17,32,1)" />
          </radialGradient>
          <radialGradient id="vignette" cx="50%" cy="50%" r="65%">
            <stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
          </radialGradient>
          <linearGradient id="scanlines" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.00)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
          </linearGradient>
          <pattern id="scanPattern" width="1" height="6" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="100%" height="100%" fill="url(#scanlines)" />
          </pattern>
        </defs>

        {/* Слои фона */}
        <rect x={0} y={0} width={size.w} height={size.h} fill="url(#bgNebula)" />
        <GridAndFiltersDefs />
        <rect x={0} y={0} width={size.w} height={size.h} fill="url(#grid)" opacity={0.9} />
        <rect x={0} y={0} width={size.w} height={size.h} fill="url(#scanPattern)" opacity={0.15} />
        <rect x={0} y={0} width={size.w} height={size.h} fill="url(#vignette)" pointerEvents="none" />

        {/* Рамка и стены */}
        <Walls frameWalls={geo.frameWalls} innerWalls={geo.innerWalls} />

        {/* Зеркала уровня */}
        <Mirrors
          compact={compact}
          mainMirrorPx={geo.mirrorMainPx}
          mainMirror={mainMirror}
          extraMirrorsPx={geo.extraMirrorsPx}
          onPick={(id, e) => {
            if (e.shiftKey) setDrag({ type: "mirrorMove", id });
            else setDrag({ type: "mirrorRot", id });
          }}
        />

        {/* Установленные игроком отражатели */}
        {geo.placedReflectorsPx.map((m) => (
          <g key={m.id}>
            <line
              x1={m.A.x}
              y1={m.A.y}
              x2={m.B.x}
              y2={m.B.y}
              stroke="#90f0a5"
              strokeWidth={compact ? 6 : 7}
              strokeLinecap="round"
              opacity={0.95}
            />
          </g>
        ))}

        {/* Фильтры / обманки / цель */}
        <Circles
          circlesPx={geo.circlesPx}
          maskToHex={maskToHex}
          onFilterPick={(id) => setDrag({ type: "filterMove", id })}
        />

        {/* Лучи */}
        <Beams
          segments={trace.segments}
          sparks={trace.sparks}
          maskToHex={maskToHex}
          compact={compact}
          pointKey={pointKey}
        />

        {/* Источник — поворот по drag */}
        <Source
          compact={compact}
          sourcePx={geo.sourcePx}
          srcDir={geo.srcDir}
          onPick={() => setDrag({ type: "srcRot" })}
        />

        {/* ===== LEVEL CLEAR overlay ===== */}
        {trace.hitGoal && (
          <g>
            <rect x={0} y={0} width={size.w} height={size.h} fill="rgba(0,0,0,0.35)">
              <animate attributeName="opacity" values="0;0.35" dur="0.25s" fill="freeze" />
            </rect>
            {(() => {
              const goal = geo.circlesPx.find((c) => c.kind === "goal");
              if (!goal) return null;
              const cx = goal.C.x, cy = goal.C.y;
              const col = maskToHex(goal.requiredMask ?? 0);
              return (
                <>
                  {[0, 0.35, 0.7].map((delay, i) => (
                    <circle
                      key={`clear-ring-${i}`}
                      cx={cx}
                      cy={cy}
                      r={goal.r}
                      stroke={col}
                      strokeWidth={3}
                      fill="none"
                      opacity={0.85}
                    >
                      <animate
                        attributeName="r"
                        values={`${goal.r}; ${Math.max(size.w, size.h)}`}
                        dur="1.6s"
                        begin={`${delay}s`}
                      />
                      <animate attributeName="opacity" values="0.85; 0" dur="1.6s" begin={`${delay}s`} />
                    </circle>
                  ))}
                </>
              );
            })()}
            <g>
              <defs>
                <filter id="clearGlow" x="-120%" y="-120%" width="340%" height="340%">
                  <feGaussianBlur stdDeviation="4" result="b1" />
                  <feGaussianBlur stdDeviation="8" result="b2" />
                  <feMerge>
                    <feMergeNode in="b2" />
                    <feMergeNode in="b1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <text
                x={size.w / 2}
                y={size.h / 2}
                textAnchor="middle"
                style={{ fontWeight: 900, letterSpacing: 2 }}
                fontSize={compact ? 28 : 36}
                fill="#ffffff"
                filter="url(#clearGlow)"
              >
                LEVEL CLEAR
                <animate attributeName="opacity" values="0;1;1" dur="0.8s" fill="freeze" />
              </text>
              <text
                x={size.w / 2}
                y={size.h / 2 + (compact ? 26 : 34)}
                textAnchor="middle"
                style={{ fontWeight: 700, letterSpacing: 1 }}
                fontSize={compact ? 14 : 16}
                fill="rgba(255,255,255,0.9)"
              >
                Нажми «Новый уровень» вверху, чтобы продолжить
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
