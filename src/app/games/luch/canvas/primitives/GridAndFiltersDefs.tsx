"use client";

import React from "react";

export function GridAndFiltersDefs() {
  return (
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
  );
}
