// luch/canvas/layers/BackgroundLayer.tsx
"use client";

import React from "react";

export default function BackgroundLayer({ size }: { size: { w: number; h: number } }) {
  return (
    <>
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

      <rect x={0} y={0} width={size.w} height={size.h} fill="url(#bgNebula)" />
      <rect x={0} y={0} width={size.w} height={size.h} fill="url(#grid)" opacity={0.9} />
      <rect x={0} y={0} width={size.w} height={size.h} fill="url(#scanPattern)" opacity={0.14} />
      <rect x={0} y={0} width={size.w} height={size.h} fill="url(#vignette)" pointerEvents="none" />
    </>
  );
}
