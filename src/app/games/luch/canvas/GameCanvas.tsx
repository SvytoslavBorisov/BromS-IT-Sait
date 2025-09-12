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

  // зеркала
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

  // внешние действия над зеркалами
  rotateById: (id: string, deltaDeg: number) => void;
  moveMirrorById: (id: string, c: { x: number; y: number }) => void;
}>;

export default function GameCanvas(props: Props) {
  const {
    compact,
    sourcePct, sourceDeg, setSourceDeg,
    mainMirror, extraMirrorsPct,
    frameWallsPct, innerWallsPct,
    circlesPct,
    placedReflectorsPct,
    placeMode, setPlaceMode, placeReflector,
    updateFilterPos, rotateById, moveMirrorById,

    // неиспользуемые прямо здесь, но часть публичного API — помечаем, чтобы анализаторы не ругались
    setMainMirror: _setMainMirror,
    setExtraMirrorsPct: _setExtraMirrorsPct,
    setCirclesPct: _setCirclesPct,
    setPlacedReflectorsPct: _setPlacedReflectorsPct,
  } = props as Props & {
    setMainMirror: (m: MirrorSpec) => void;
    setExtraMirrorsPct: (m: MirrorSpec[]) => void;
    setCirclesPct: (c: CircleObj[]) => void;
    setPlacedReflectorsPct: (m: SegmentObj[]) => void;
  };

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

  // DRAG + установка отражателей
  const [drag, setDrag] = useState<DragState>({ type: "none" });
  useDragHandlers({
    wrapRef, drag, setDrag,
    size,
    sourcePx: geo.sourcePx,
    mainMirror, extraMirrorsPct,
    setSourceDeg, rotateById, moveMirrorById, updateFilterPos,
  });

  const onCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!placeMode) return;
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
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
  };

  return (
    <div ref={wrapRef}>
      <svg
        width="100%"
        height={Math.round(size.h)}
        viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ display: "block", borderRadius: 12 }}
        onPointerDown={onCanvasPointerDown}
      >
        {/* Атмосферный фон и виньетка */}
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

        {/* Фон */}
        <rect x={0} y={0} width={size.w} height={size.h} fill="url(#bgNebula)" />
        <GridAndFiltersDefs />
        {/* Сетка */}
        <rect x={0} y={0} width={size.w} height={size.h} fill="url(#grid)" opacity={0.9} />
        {/* Едва заметные сканлайны */}
        <rect x={0} y={0} width={size.w} height={size.h} fill="url(#scanPattern)" opacity={0.15} />
        {/* Виньетка */}
        <rect x={0} y={0} width={size.w} height={size.h} fill="url(#vignette)" pointerEvents="none" />

        {/* Рамка и стены */}
        <Walls frameWalls={geo.frameWalls} innerWalls={geo.innerWalls} />

        {/* Зеркала */}
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
        {geo.placedReflectorsPx.map(m => (
          <g key={m.id}>
            <line
              x1={m.A.x} y1={m.A.y} x2={m.B.x} y2={m.B.y}
              stroke="#90f0a5" strokeWidth={compact ? 6 : 7}
              strokeLinecap="round" opacity={0.95}
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

        {/* ===== LEVEL CLEAR overlay (когда trace.hitGoal === true) ===== */}
        {trace.hitGoal && (
          <g>
            {/* мягкое затемнение фона */}
            <rect x={0} y={0} width={size.w} height={size.h} fill="rgba(0,0,0,0.35)">
              <animate attributeName="opacity" values="0;0.35" dur="0.25s" fill="freeze" />
            </rect>

            {/* пульсирующие кольца из центра цели (ищем её координаты) */}
            {(() => {
              const goal = geo.circlesPx.find(c => c.kind === "goal");
              if (!goal) return null;
              const cx = goal.C.x, cy = goal.C.y;
              const col = maskToHex(goal.requiredMask ?? 0);
              return (
                <>
                  {[0, 0.35, 0.7].map((delay, i) => (
                    <circle
                      key={`clear-ring-${i}`}
                      cx={cx} cy={cy} r={goal.r}
                      stroke={col} strokeWidth={3} fill="none" opacity={0.85}
                    >
                      <animate attributeName="r" values={`${goal.r}; ${Math.max(size.w, size.h)}`} dur="1.6s" begin={`${delay}s`} />
                      <animate attributeName="opacity" values="0.85; 0" dur="1.6s" begin={`${delay}s`} />
                    </circle>
                  ))}
                </>
              );
            })()}

            {/* надпись LEVEL CLEAR */}
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
                x={size.w / 2} y={size.h / 2}
                textAnchor="middle"
                style={{ fontWeight: 900, letterSpacing: 2 }}
                fontSize={compact ? 28 : 36}
                fill="#ffffff" filter="url(#clearGlow)"
              >
                LEVEL CLEAR
                <animate attributeName="opacity" values="0;1;1" dur="0.8s" fill="freeze" />
              </text>
              <text
                x={size.w / 2} y={size.h / 2 + (compact ? 26 : 34)}
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
