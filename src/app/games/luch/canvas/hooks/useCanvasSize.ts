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

    const update = () => {
      const r = el.getBoundingClientRect();
      const maxW = r.width;
      const maxH = window.innerHeight - 100; // минус top + bottom бары
      let w = maxW;
      let h = Math.round(w / aspect);
      if (h > maxH) {
        h = maxH;
        w = Math.round(h * aspect);
      }
      setSize({ w, h });
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    update();

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [wrapRef, aspect]);

  return size;
}
