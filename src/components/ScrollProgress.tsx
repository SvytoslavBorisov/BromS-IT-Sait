// components/ScrollProgress.tsx
"use client";

import { useEffect, useState } from "react";

export default function ScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    let raf = 0;
    const docEl = document.documentElement;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = docEl.scrollHeight - docEl.clientHeight;
        setP(max > 0 ? window.scrollY / max : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div
      aria-hidden
      className="
        fixed right-1 md:right-2 top-2 bottom-2 w-1.5 md:w-2
        rounded-full origin-top pointer-events-none z-[60]
        bg-gradient-to-b from-neutral-400/80 via-neutral-700 to-neutral-900
        shadow-[0_0_0_1px_rgba(0,0,0,.3)]
      "
      style={{ transform: `scaleY(${Math.max(0, Math.min(1, p))})` }}
    />
  );
}
