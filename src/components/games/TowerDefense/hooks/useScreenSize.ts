"use client";
import { useEffect, useState } from "react";
import type { ScreenSize } from "../types";

export function useScreenSize(): ScreenSize {
  const [s, setS] = useState<ScreenSize>({ width: 0, height: 0 });
  useEffect(() => {
    const apply = () => setS({ width: window.innerWidth, height: window.innerHeight });
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return s;
}
