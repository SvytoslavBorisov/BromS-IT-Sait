"use client";

import { useEffect, useState } from "react";

export function useCanvasSize(
  wrapRef: React.RefObject<HTMLDivElement | null>,
  aspect: number
) {
  const [size, setSize] = useState({ w: 1280, h: 720 });

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
  }, [wrapRef, aspect]);

  return size;
}
