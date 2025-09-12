"use client";

import React from "react";
import { SegmentObj } from "../../engine/types";

export function Walls({ frameWalls, innerWalls }: {
  frameWalls: SegmentObj[]; innerWalls: SegmentObj[];
}) {
  return (
    <>
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
    </>
  );
}
