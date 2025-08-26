"use client";
import { useEffect, useRef } from "react";
import type { Enemy, ScreenSize } from "../types";
import { ENEMY_HP, ENEMY_SPAWN_MS } from "../config";

/** Спавнит врагов с краёв экрана через равные интервалы */
export function useEnemySpawner(
  screen: ScreenSize,
  setEnemies: React.Dispatch<React.SetStateAction<Enemy[]>>
) {
  const idSeq = useRef(1);

  useEffect(() => {
    if (screen.width === 0 || screen.height === 0) return;

    const spawn = () => {
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = 0; y = Math.random() * screen.height; }
      else if (side === 1) { x = screen.width; y = Math.random() * screen.height; }
      else if (side === 2) { x = Math.random() * screen.width; y = 0; }
      else { x = Math.random() * screen.width; y = screen.height; }

      setEnemies(prev => [...prev, { id: idSeq.current++, x, y, hp: ENEMY_HP }]);
    };

    const t = setInterval(spawn, ENEMY_SPAWN_MS);
    return () => clearInterval(t);
  }, [screen, setEnemies]);
}
