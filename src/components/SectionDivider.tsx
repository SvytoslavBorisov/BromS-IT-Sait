// components/SectionDivider.tsx
"use client";

import React from "react";

const PATH_MAIN = `
  M0,78 C240,140 420,20 720,78 C1020,130 1200,40 1440,92
  C1680,140 1860,20 2160,78 C2460,130 2640,40 2880,92
`;

export default React.memo(function SectionDivider({
  flip = false,
  className = "",
}: { flip?: boolean; className?: string }) {
  const id = React.useId();
  const rootClass = `relative isolate h-12 md:h-16 -mt-4 pointer-events-none ${className}`;

  return (
    <div aria-hidden className={rootClass} style={{ contain: "paint" }}>
      <svg
        className={`absolute inset-0 h-full w-full ${flip ? "rotate-180" : ""}`}
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <linearGradient id={`${id}-shadow`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="black" stopOpacity="0.15" />
            <stop offset="1" stopColor="black" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0.9" />
            <stop offset="1" stopColor="white" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        <g>
          <path
            d={PATH_MAIN}
            fill="none"
            stroke={`url(#${id}-shadow)`}
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path d={PATH_MAIN} fill="none" stroke={`url(#${id}-gloss)`} strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
});
