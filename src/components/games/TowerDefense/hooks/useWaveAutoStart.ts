"use client";
import { useEffect } from "react";
import { useGameStore } from "../store";
import { WAVES } from "../config";

export function useWaveAutoStart() {
  useEffect(() => {
    // реагируем на смену активности волны
    const unsub = useGameStore.subscribe((state, prev) => {
      // волна только что завершилась
      const finished =
        prev.wave.isActive === true &&
        state.wave.isActive === false &&
        // все враги убраны и пуль нет
        prev.enemies.length === 0 &&
        prev.bullets.length === 0;

      if (!finished) return;

      const justFinishedIndex = prev.wave.current;        // какая волна завершилась
      const nextIndex = justFinishedIndex + 1;

      // бонус за волну
      const bonus = WAVES[justFinishedIndex]?.bonus ?? 0;
      if (bonus > 0) {
        useGameStore.setState(s => ({ gold: s.gold + bonus }));
      }

      // если есть следующая волна — стартуем через короткую паузу
      if (nextIndex < WAVES.length) {
        setTimeout(() => {
          // поднимаем индекс и активируем
          useGameStore.setState(s => ({
            wave: { current: nextIndex, isActive: true, spawned: 0 },
          }));
        }, 600);
      }
    });

    return () => unsub();
  }, []);
}
