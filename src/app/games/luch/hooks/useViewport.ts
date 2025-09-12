// luch/hooks/useViewport.ts
"use client";
import { useEffect, useState } from "react";
import { MOBILE_BREAKPOINT } from "../engine/constants";

export function useViewport() {
  const [vw, setVw] = useState(1200);
  useEffect(() => {
    const on = () => setVw(window.innerWidth);
    on();
    window.addEventListener("resize", on, { passive: true });
    return () => window.removeEventListener("resize", on);
  }, []);
  return { vw, compact: vw < MOBILE_BREAKPOINT };
}
