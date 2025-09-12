"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleObj,
  SegmentObj,
  MirrorSpec,
  InventoryItem,
  maskToHex,
} from "../engine/types";
import { MAX_BOUNCES } from "../engine/constants";
import {
  clampPct,
  deg,
  pointKey,
  rad,
  toPct,
  toPx,
  norm,
} from "../engine/utils";
import { traceRay } from "../engine/physics";

/**
 * GameCanvas — только поле (SVG) + события.
 * Внешние панели рендерятся вне канваса, поэтому ничто не перекрывает.
 */

type Props = {
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
};

export default function GameCanvas({
  compact,
  sourcePct,
  sourceDeg,
  setSourceDeg,
  mainMirror,
  setMainMirror,
  extraMirrorsPct,
  setExtraMirrorsPct,
  frameWallsPct,
  innerWallsPct,
  circlesPct,
  setCirclesPct,
  placedReflectorsPct,
  setPlacedReflectorsPct,
  placeMode,
  setPlaceMode,
  placeReflector,
  updateFilterPos,
  rotateById,
  moveMirrorById,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1280, h: 720 });

  /** Авторазмер: 16:9 desktop, 3:4 mobile */
  const aspect = compact ? 3 / 4 : 16 / 9;
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const w = Math.max(360, r.width);
      const h = Math.max(360, Math.round(w / aspect));
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  /** ---------- % → px ---------- */
  const sourcePx = useMemo(
    () => toPx(sourcePct, size.w, size.h),
    [sourcePct, size.w, size.h]
  );
  const srcDir = useMemo(
    () => ({ x: Math.cos(rad(sourceDeg)), y: Math.sin(rad(sourceDeg)) }),
    [sourceDeg]
  );

  const mirrorMainPx: SegmentObj = useMemo(() => {
    const halfLen = (mainMirror.lenPct ?? 0.2) * size.w * 0.5;
    const a = rad(mainMirror.deg);
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    const c = toPx(mainMirror.center, size.w, size.h);
    return {
      id: mainMirror.id,
      kind: "mirror",
      A: { x: c.x - dir.x * halfLen, y: c.y - dir.y * halfLen },
      B: { x: c.x + dir.x * halfLen, y: c.y + dir.y * halfLen },
    };
  }, [
    mainMirror.center.x,
    mainMirror.center.y,
    mainMirror.deg,
    mainMirror.lenPct,
    mainMirror.id,
    size.w,
    size.h,
  ]);

  const extraMirrorsPx = useMemo<SegmentObj[]>(
    () =>
      extraMirrorsPct.map((m) => {
        const c = toPx(m.center, size.w, size.h);
        const half = (m.lenPct ?? 0.16) * size.w * 0.5;
        const a = rad(m.deg);
        const d = { x: Math.cos(a), y: Math.sin(a) };
        return {
          id: m.id,
          kind: "mirror",
          A: { x: c.x - d.x * half, y: c.y - d.y * half },
          B: { x: c.x + d.x * half, y: c.y + d.y * half },
        };
      }),
    [extraMirrorsPct, size.w, size.h]
  );

  const frameWalls = useMemo<SegmentObj[]>(
    () =>
      frameWallsPct.map((s) => ({
        ...s,
        A: toPx(s.A, size.w, size.h),
        B: toPx(s.B, size.w, size.h),
      })),
    [frameWallsPct, size.w, size.h]
  );
  const innerWalls = useMemo<SegmentObj[]>(
    () =>
      innerWallsPct.map((s) => ({
        ...s,
        A: toPx(s.A, size.w, size.h),
        B: toPx(s.B, size.w, size.h),
      })),
    [innerWallsPct, size.w, size.h]
  );
  const wallsPx = useMemo<SegmentObj[]>(
    () => [...frameWalls, ...innerWalls],
    [frameWalls, innerWalls]
  );

  const circlesPx = useMemo<CircleObj[]>(
    () =>
      circlesPct.map((c) => ({
        ...c,
        C: toPx(c.C, size.w, size.h),
        r: c.r * Math.min(size.w, size.h),
      })),
    [circlesPct, size.w, size.h]
  );

  const placedReflectorsPx = useMemo<SegmentObj[]>(
    () =>
      placedReflectorsPct.map((m) => ({
        ...m,
        A: toPx(m.A, size.w, size.h),
        B: toPx(m.B, size.w, size.h),
      })),
    [placedReflectorsPct, size.w, size.h]
  );

  /** ---------- Трассировка: БЕЗ setState, через useMemo ---------- */
  const traceKey = useMemo(() => {
    // Ключ только из примитивов, чтобы мемо работал стабильно и без лишних перерисовок.
    const wallsK = wallsPx.map((s) => `${s.id}:${s.A.x},${s.A.y},${s.B.x},${s.B.y}`).join("|");
    const mirrorsAll = [mirrorMainPx, ...extraMirrorsPx, ...placedReflectorsPx];
    const mirK = mirrorsAll.map((s) => `${s.id}:${s.A.x},${s.A.y},${s.B.x},${s.B.y}`).join("|");
    const circK = circlesPx
      .map((c) => `${c.id}:${c.kind}:${c.C.x},${c.C.y},${c.r}:${c.mask ?? 0}:${c.requiredMask ?? 0}`)
      .join("|");
    return `${size.w}x${size.h};src:${sourcePx.x},${sourcePx.y};dir:${srcDir.x},${srcDir.y};W:${wallsK};M:${mirK};C:${circK}`;
  }, [
    size.w,
    size.h,
    sourcePx.x,
    sourcePx.y,
    srcDir.x,
    srcDir.y,
    wallsPx,
    mirrorMainPx,
    extraMirrorsPx,
    placedReflectorsPx,
    circlesPx,
  ]);

  const traceResult = useMemo(() => {
    const minSide = Math.min(size.w, size.h);
    const mirrorsAll = [mirrorMainPx, ...extraMirrorsPx, ...placedReflectorsPx];
    return traceRay({
      sourcePx,
      srcDir: norm(srcDir),
      walls: wallsPx,
      mirrors: mirrorsAll,
      circles: circlesPx,
      maxBounces: MAX_BOUNCES,
      eps: Math.max(0.001 * minSide, 0.75),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traceKey]); // ← вся математика завязана на стабильный ключ

  /** ---------- Управление (drag/placement) ---------- */

  type DragState =
    | { type: "none" }
    | { type: "srcRot" }
    | { type: "mirrorRot"; id: string }
    | { type: "mirrorMove"; id: string }
    | { type: "filterMove"; id: string };

  const [drag, setDrag] = useState<DragState>({ type: "none" });

  // Установка отражателя из инвентаря
  const onCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const atPx = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (placeMode) {
      const v = { x: atPx.x - sourcePx.x, y: atPx.y - sourcePx.y };
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
  };

  // Drag: поворот/перемещение зеркал, перетаскивание фильтров, поворот источника
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (drag.type === "none") return;
      const rect = wrapRef.current?.querySelector("svg")?.getBoundingClientRect();
      if (!rect) return;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      if (drag.type === "srcRot") {
        const v = { x: px - sourcePx.x, y: py - sourcePx.y };
        setSourceDeg(deg(Math.atan2(v.y, v.x)));
        return;
      }

      if (drag.type === "mirrorRot") {
        const isMain = drag.id === mainMirror.id;
        const centerPx = isMain
          ? toPx(mainMirror.center, size.w, size.h)
          : toPx(
              extraMirrorsPct.find((m) => m.id === drag.id)!.center,
              size.w,
              size.h
            );
        const v = { x: px - centerPx.x, y: py - centerPx.y };
        const nd = deg(Math.atan2(v.y, v.x));
        // вычисляем дельту к текущему углу и прокидываем во внешний апдейтер (он уже мемоизирует стейт)
        const currentDeg = isMain
          ? mainMirror.deg
          : extraMirrorsPct.find((m) => m.id === drag.id)!.deg;
        rotateById(drag.id, nd - currentDeg);
        return;
      }

      if (drag.type === "mirrorMove") {
        moveMirrorById(drag.id, clampPct(toPct({ x: px, y: py }, size.w, size.h)));
        return;
      }

      if (drag.type === "filterMove") {
        updateFilterPos(drag.id, clampPct(toPct({ x: px, y: py }, size.w, size.h)));
        return;
      }
    };
    const onUp = () => setDrag({ type: "none" });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [
    drag,
    sourcePx.x,
    sourcePx.y,
    size.w,
    size.h,
    mainMirror.id,
    mainMirror.center.x,
    mainMirror.center.y,
    mainMirror.deg,
    extraMirrorsPct,
    rotateById,
    moveMirrorById,
    updateFilterPos,
  ]);

  /** ---------- Рендер ---------- */
  return (
    <div ref={wrapRef}>
      <svg
        width="100%"
        height={Math.round(size.h)}
        viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ display: "block", borderRadius: 12 }}
        onPointerDown={onCanvasPointerDown}
      >
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          </pattern>
          <filter id="beamGlow" x="-90%" y="-90%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={8} result="b1"/>
            <feGaussianBlur stdDeviation={16} result="b2"/>
            <feMerge>
              <feMergeNode in="b2"/>
              <feMergeNode in="b1"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="star" x="-200%" y="-200%" width="400%" height="400%">
            <feGaussianBlur stdDeviation={2} result="b"/>
            <feMerge>
              <feMergeNode in="b"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Сетка */}
        <rect x={0} y={0} width={size.w} height={size.h} fill="url(#grid)" />

        {/* Рамка и стены */}
        {frameWalls.map((s) => (
          <line
            key={s.id}
            x1={s.A.x} y1={s.A.y} x2={s.B.x} y2={s.B.y}
            stroke="rgba(255,255,255,0.28)" strokeWidth={5} strokeLinecap="round"
          />
        ))}
        {innerWalls.map((s) => (
          <line
            key={s.id}
            x1={s.A.x} y1={s.A.y} x2={s.B.x} y2={s.B.y}
            stroke="rgba(210,220,255,0.18)" strokeWidth={5} strokeLinecap="round"
          />
        ))}

        {/* Главное зеркало */}
        {(() => {
          const m = mirrorMainPx;
          const c = toPx(mainMirror.center, size.w, size.h);
          return (
            <g
              onPointerDown={(e) => {
                if (e.shiftKey) setDrag({ type: "mirrorMove", id: mainMirror.id });
                else setDrag({ type: "mirrorRot", id: mainMirror.id });
              }}
              style={{ cursor: "grab" }}
            >
              <line
                x1={m.A.x} y1={m.A.y} x2={m.B.x} y2={m.B.y}
                stroke="#8ad2ff" strokeWidth={compact ? 7 : 8} strokeLinecap="round"
              />
              <circle cx={c.x} cy={c.y} r={compact ? 12 : 13} fill="#8ad2ff" opacity={0.95}/>
            </g>
          );
        })()}

        {/* Доп. зеркала */}
        {extraMirrorsPx.map((m) => (
          <g
            key={m.id}
            onPointerDown={(e) => {
              if (e.shiftKey) setDrag({ type: "mirrorMove", id: m.id });
              else setDrag({ type: "mirrorRot", id: m.id });
            }}
            style={{ cursor: "grab" }}
          >
            <line
              x1={m.A.x} y1={m.A.y} x2={m.B.x} y2={m.B.y}
              stroke="#6cc8ff" strokeWidth={compact ? 6 : 7} strokeLinecap="round" opacity={0.8}
            />
          </g>
        ))}

        {/* Установленные игроком отражатели */}
        {placedReflectorsPx.map((m) => (
          <g key={m.id}>
            <line
              x1={m.A.x} y1={m.A.y} x2={m.B.x} y2={m.B.y}
              stroke="#90f0a5" strokeWidth={compact ? 6 : 7} strokeLinecap="round" opacity={0.95}
            />
          </g>
        ))}

        {/* Фильтры/обманки (двигаются только фильтры) */}
        {circlesPx
          .filter((c) => c.kind !== "goal")
          .map((c) => {
            const col = c.kind === "filter" ? maskToHex(c.mask ?? 0) : "#59ff7a";
            const op = c.kind === "filter" ? 0.28 : 0.18;
            return (
              <g
                key={c.id}
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (c.kind === "filter") setDrag({ type: "filterMove", id: c.id });
                }}
                style={{ cursor: c.kind === "filter" ? "grab" : "default" }}
              >
                <circle cx={c.C.x} cy={c.C.y} r={c.r} fill={col} opacity={op} stroke={col} strokeWidth={2}/>
                <circle cx={c.C.x} cy={c.C.y} r={c.r * 0.35} fill={col} opacity={0.22}/>
              </g>
            );
          })}

        {/* Цель */}
        {(() => {
          const goalPx = circlesPx.find((c) => c.kind === "goal")!;
          const req = goalPx.requiredMask ?? 0;
          return (
            <g>
              <circle
                cx={goalPx.C.x} cy={goalPx.C.y} r={goalPx.r}
                fill="none" stroke={maskToHex(req)} strokeWidth={compact ? 5 : 6}
              />
              <circle
                cx={goalPx.C.x} cy={goalPx.C.y} r={goalPx.r * 0.25}
                fill={maskToHex(req)} opacity={0.15}
              />
              <text
                x={goalPx.C.x} y={goalPx.C.y + 5} textAnchor="middle"
                fontSize={12} fill={maskToHex(req)} style={{ fontWeight: 800 }}
              >
                GOAL
              </text>
            </g>
          );
        })()}

        {/* Лучи — цвет по маске; mask=0 → мягкий серый */}
        {traceResult.segments.map((s) => {
          const k = `seg-${pointKey(s.A.x, s.A.y, pointKey(s.B.x, s.B.y))}`;
          const col = s.mask === 0 ? "rgba(255,255,255,0.22)" : maskToHex(s.mask);
          return (
            <g key={k} filter="url(#beamGlow)">
              <line
                x1={s.A.x} y1={s.A.y} x2={s.B.x} y2={s.B.y}
                stroke={col} strokeWidth={compact ? 7 : 8} strokeLinecap="round" opacity={0.96}
              />
            </g>
          );
        })}

        {/* Вспышки */}
        {traceResult.sparks.map((p) => {
          const k = `sp-${pointKey(p.x, p.y, String(p.col))}`;
          const col = p.col ? maskToHex(p.col) : "#ffffff";
          return (
            <g key={k} filter="url(#star)">
              <circle cx={p.x} cy={p.y} r={compact ? 6 : 8} fill={col} opacity={0.55}/>
              <circle cx={p.x} cy={p.y} r={compact ? 14 : 18} fill={col} opacity={0.12}/>
            </g>
          );
        })}

        {/* Источник — поворот по drag */}
        <g
          onPointerDown={(e) => {
            e.preventDefault();
            setDrag({ type: "srcRot" });
          }}
          style={{ cursor: "grab" }}
        >
          <circle cx={sourcePx.x} cy={sourcePx.y} r={compact ? 12 : 13} fill="#ffffff" />
          <line
            x1={sourcePx.x} y1={sourcePx.y}
            x2={sourcePx.x + srcDir.x * (compact ? 30 : 34)}
            y2={sourcePx.y + srcDir.y * (compact ? 30 : 34)}
            stroke="#ffffff" strokeWidth={3} strokeLinecap="round"
          />
        </g>
      </svg>
    </div>
  );
}
