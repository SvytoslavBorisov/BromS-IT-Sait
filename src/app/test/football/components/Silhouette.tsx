"use client";
import React from "react";

/** Силуэт-аватар игрока (SVG) */
export default function Silhouette() {
  return (
    <svg viewBox="0 0 64 64" className="w-10 h-10 text-neutral-200 dark:text-neutral-600">
      <circle cx="32" cy="22" r="12" fill="currentColor" />
      <path d="M8 58c0-11 10-20 24-20s24 9 24 20" fill="currentColor" />
    </svg>
  );
}
