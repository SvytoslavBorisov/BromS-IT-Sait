// src/components/ProtocolPlayer.tsx
"use client";

import { motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import { GraphView } from "./GraphView";
import { parseGraph6, toGraph6, adjToEdges } from "./graph6";
import { applyPermToAdj, composePerm, invertPerm, randomPerm } from "./perm";
import type { GIInstance, GIInstanceOptions, ProtocolEngine, RoundEvent } from "./types";
export { ProtocolPlayer } from "./player/Player";
export interface ProtocolPlayerProps {
  opts: GIInstanceOptions;
}

function useTicker(active: boolean, intervalMs: number, onTick: () => void) {
  const t = useRef<number | null>(null);
  const saved = useRef(onTick);
  saved.current = onTick;

  const clear = () => {
    if (t.current != null) {
      window.clearInterval(t.current);
      t.current = null;
    }
  };

  const start = () => {
    clear();
    t.current = window.setInterval(() => saved.current(), intervalMs);
  };

  if (active && t.current == null) start();
  if (!active && t.current != null) clear();
}
