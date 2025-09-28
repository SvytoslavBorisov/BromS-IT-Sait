"use client";
import React from "react";

/**
 * Миниатюрный треугольный наконечник (2×2 px).
 * markerUnits="userSpaceOnUse" — фиксированный размер, не раздувается от толщины линии.
 */
export default function ArrowDefs({ idPrefix = "" }: { idPrefix?: string }) {
  const tiny = (name: string, fill: string) => (
    <marker
      id={`${idPrefix}${name}`}
      markerUnits="userSpaceOnUse"
      markerWidth={2}
      markerHeight={2}
      refX={1.5}     // кончик совпадает с концом линии
      refY={1}     // центр по вертикали
      orient="auto"
      overflow="visible"
    >
      {/* Острый треугольник в пределах 2×2 */}
      <path d="M0,0 L2,1 L0,2 Z" fill={fill} />
    </marker>
  );

  return (
    <defs>
      {tiny("arr-sky", "#0ea5e9")}
      {tiny("arr-emerald", "#059669")}
      {tiny("arr-neutral", "#94a3b8")}
    </defs>
  );
}
