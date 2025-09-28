// src/app/zk-gi/player/parts/useTicker.ts
"use client";

import { useEffect, useRef } from "react";

export function useTicker(active: boolean, intervalMs: number, onTick: () => void) {
  const saved = useRef(onTick);
  saved.current = onTick;

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => saved.current(), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);
}
