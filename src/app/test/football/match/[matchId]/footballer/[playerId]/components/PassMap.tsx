"use client";

import React, { useMemo, useRef, useState } from "react";
import Pitch from "./Pitch";
import Tooltip from "./Tooltip";
import type { PassRow } from "../hooks/usePlayerPasses";
import ArrowDefs from "./defs/ArrowDefs";
import { usePassLayers } from "./PassLayers";

type HoverState = { i: number; x: number; y: number } | null;

export default function PassMap({
  passes,
  className = "w-full h-[60vh]",
  idPrefix = "",
}: {
  passes: PassRow[];
  className?: string;
  /** Если на странице несколько карт — задайте уникальный префикс, чтобы не конфликтовали id маркеров */
  idPrefix?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverState>(null);

  const layers = useMemo(
    () => usePassLayers(passes, setHover, idPrefix),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [passes, idPrefix]
  );

  const tip = (() => {
    if (!hover) return null;
    const p = passes[hover.i];
    if (!p) return null;
    const mins = String(p.minute ?? 0).padStart(2, "0");
    const secs = String(p.second ?? 0).padStart(2, "0");
    return (
      <Tooltip x={hover.x} y={hover.y} visible>
        <div className="font-medium mb-1">{p.completed ? "Точный пас" : "Неточный пас"}</div>
        <div className="text-neutral-700">
          Время: {mins}:{secs}
          {p.toName ? <> · Кому: <b>{p.toName}</b></> : null}
        </div>
        <div className="text-neutral-700">Длина: {p.lenSB.toFixed(1)} SB · ≈ {p.lenM.toFixed(1)} м</div>
        {(p.key || p.cross) && (
          <div className="mt-1 text-[11px]">
            {p.key && (
              <span className="inline-block px-1.5 py-0.5 mr-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                ключевой
              </span>
            )}
            {p.cross && (
              <span className="inline-block px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
                кросс
              </span>
            )}
          </div>
        )}
      </Tooltip>
    );
  })();

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <Pitch className="w-full h-full">
        {/* Минимальные и элегантные маркеры стрелок */}
        <ArrowDefs idPrefix={idPrefix} />

        {/* Порядок слоёв: fail (снизу), succ, key (сверху) */}
        <g>{layers.fail}</g>
        <g>{layers.succ}</g>
        <g>{layers.keyA}</g>
      </Pitch>
      {tip}
    </div>
  );
}
