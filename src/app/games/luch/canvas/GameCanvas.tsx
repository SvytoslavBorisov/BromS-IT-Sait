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
import usePlacedInteractions from "./hooks/usePlacedInteractions";

import { GridAndFiltersDefs } from "./primitives/GridAndFiltersDefs";
import { Walls } from "./render/Walls";
import { Mirrors } from "./render/Mirrors";
import { Circles } from "./render/Circles";
import { Beams } from "./render/Beams";
import { Source } from "./render/Source";

import BackgroundLayer from "./layers/BackgroundLayer";
import FrameAndWalls from "./layers/FrameAndWalls";
import PlacedReflectors from "./layers/PlacedReflectors";
import LevelClearOverlay from "./layers/LevelClearOverlay";

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

  // действия над размещёнными отражателями
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

  // -------- Геометрия (px) --------
  const geo = useGeometry({
    size, sourcePct, sourceDeg, mainMirror, extraMirrorsPct,
    frameWallsPct, innerWallsPct, circlesPct, placedReflectorsPct,
  });

  // -------- Трассировка --------
  const trace = useTrace({
    size, sourcePx: geo.sourcePx, srcDir: norm(geo.srcDir),
    wallsPx: geo.wallsPx, mirrorsPx: geo.mirrorsAllPx,
    circlesPx: geo.circlesPx, placedReflectorsPx: geo.placedReflectorsPx,
    mirrorMainPx: geo.mirrorMainPx, extraMirrorsPx: geo.extraMirrorsPx,
    maxBounces: MAX_BOUNCES,
  });

  // -------- Drag базовых сущностей (источник/зеркала/фильтры) --------
  const [drag, setDrag] = useState<DragState>({ type: "none" });
  useDragHandlers({
    wrapRef, drag, setDrag,
    size, sourcePx: geo.sourcePx,
    mainMirror, extraMirrorsPct,
    setSourceDeg, rotateById, moveMirrorById, updateFilterPos,
    movePlacedById,         // ← уже есть в props GameCanvas
    rotatePlacedById,       // ← уже есть в props GameCanvas
  });

  // -------- Размещение из инвентаря + перемещение/вращение размещённых --------
  const placed = usePlacedInteractions({
    size,
    placedReflectorsPct,
    movePlacedById,
    rotatePlacedById,
  });

  // установка отражателя из инвентаря (клик по сцене)
  function tryPlaceReflector(e: React.PointerEvent<SVGSVGElement>) {
    if (!placeMode) return false;
    const rect = e.currentTarget.getBoundingClientRect();
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
    return true;
  }

  // объединённые хендлеры указателя
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    // сначала попытка установки предмета
    if (tryPlaceReflector(e)) return;
    // иначе — попытка подхватить размещённый отражатель
    placed.onPointerDown(e);
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    placed.onPointerMove(e);
  }
  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    placed.onPointerUp(e);
  }
  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    placed.onWheel(e);
  }

  return (
    <div ref={wrapRef}>
      <svg
        width="100%"
        height={Math.round(size.h)}
        viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ display: "block", borderRadius: 12, background: "#0b1220" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      >
        {/* Фон/def'ы */}
        <GridAndFiltersDefs />
        <BackgroundLayer size={size} />

        {/* Рамка и стены */}
        <FrameAndWalls frameWalls={geo.frameWalls} innerWalls={geo.innerWalls} />

        {/* Зеркала уровня */}
        <Mirrors
          compact={compact}
          mainMirrorPx={geo.mirrorMainPx}
          mainMirror={mainMirror}
          extraMirrorsPx={geo.extraMirrorsPx}
          onPick={(id, e) => setDrag({ type: e.shiftKey ? "mirrorMove" : "mirrorRot", id })}
        />

        {/* Пользовательские отражатели */}
        <PlacedReflectors
          reflectors={geo.placedReflectorsPx}
          selectedId={drag.type === "placedMove" || drag.type === "placedRot" ? (drag as any).id : null}
          onPick={(id, e) => setDrag({ type: e.shiftKey ? "placedMove" : "placedRot", id })}
        />

        {/* Круги (фильтры/обманки/цель) */}
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

        {/* Источник */}
        <Source compact={compact} sourcePx={geo.sourcePx} srcDir={geo.srcDir} onPick={() => setDrag({ type: "srcRot" })} />

        {/* Оверлей победы */}
        <LevelClearOverlay
          hit={trace.hitGoal}
          size={size}
          maskToHex={maskToHex}
          circlesPx={geo.circlesPx}
          totalLength={trace.totalLength}
        />
      </svg>
    </div>
  );
}
