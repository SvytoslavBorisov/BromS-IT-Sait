// useWaveSpawner.ts — упрощённый и безопасный вариант
"use client";
import { useEffect, useRef } from "react";
import { useGameStore } from "../store";
import { ENEMY_HP_BASE, WAVES } from "../config";
import type { ScreenSize } from "../types";

export function useWaveSpawner(screen: ScreenSize) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const stop = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

    const maybeStart = () => {
      const s = useGameStore.getState();
      if (!s.wave.isActive) return;
      if (screen.width === 0 || screen.height === 0) return;

      const waveCfg = WAVES[s.wave.current] ?? WAVES[WAVES.length - 1];
      timerRef.current = window.setInterval(() => {
        const st = useGameStore.getState();
        if (!st.wave.isActive) return;
        if (st.wave.spawned >= waveCfg.count) { stop(); return; }

        const side = Math.floor(Math.random() * 4);
        let x = 0, y = 0;
        if (side === 0) { x = 0; y = Math.random() * screen.height; }
        else if (side === 1) { x = screen.width; y = Math.random() * screen.height; }
        else if (side === 2) { x = Math.random() * screen.width; y = 0; }
        else { x = Math.random() * screen.width; y = screen.height; }

        const hp = Math.round(ENEMY_HP_BASE * (WAVES[st.wave.current]?.hpMul ?? 1) * (1 + st.wave.current * 0.25));
        st.addEnemy({ id: Date.now() + Math.random(), x, y, hp });
        st.waveSpawnedInc();
      }, waveCfg.interval);
    };

    // запуск/перезапуск по изменениям isActive/current/экрана
    const unsub = useGameStore.subscribe((state, prev) => {
      const waveChanged = state.wave.isActive !== prev.wave.isActive || state.wave.current !== prev.wave.current;
      if (waveChanged) { stop(); maybeStart(); }
    });

    // при монтировании
    maybeStart();

    return () => { stop(); unsub(); };
  }, [screen.width, screen.height]);
}
