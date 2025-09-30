// components/footer/FooterBackground.tsx
"use client";

import React from "react";

/** Плавный переход от белого блока сверху к тёмному футеру */
export default function FooterBackground() {
  return (
    <>
      {/* Мягкий фейд сверху (под белый контент над футером) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-1 h-2
                   bg-gradient-to-b from-white to-rgb[5,5,5]"
      />
      {/* Едва заметный «туман» внутри, чтобы верхние строки футера не казались жёсткими */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-8
                   bg-gradient-to-b from-white/5 to-transparent"
      />
    </>
  );
}
