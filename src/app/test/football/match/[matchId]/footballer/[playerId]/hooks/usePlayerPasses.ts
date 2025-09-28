"use client";

import { useMemo } from "react";
import type { SBEvent } from "../../../../../types/statsbomb";

export type PassRow = {
  x1: number; y1: number; x2: number; y2: number;
  completed: boolean;
  key: boolean;
  cross: boolean;
  toName?: string;
  minute?: number; second?: number;
  lenSB: number;     // длина в системе 120x80
  lenM: number;      // ≈ метры с учётом 105x68
};

function computeFlip(passes: PassRow[]): boolean {
  if (!passes.length) return false;
  const avgDx = passes.reduce((s, p) => s + (p.x2 - p.x1), 0) / passes.length;
  return avgDx < 0; // если «влево» — зеркалим
}

export function usePlayerPasses(raw: SBEvent[] | null, playerId: string | number, autoFlip = true) {
  return useMemo(() => {
    if (!raw) return { passes: [] as PassRow[], flipped: false };

    const pidStr = String(playerId);
    const rows: PassRow[] = [];

    for (const ev of raw) {
      if (ev?.type?.name !== "Pass") continue;
      const pid = ev?.player?.id;
      if (pid == null || String(pid) !== pidStr) continue;

      const loc = ev?.location as number[] | undefined;
      const end = ev?.pass?.end_location as number[] | undefined;
      if (!loc || !end || loc.length < 2 || end.length < 2) continue;

      const completed = !(ev?.pass?.outcome?.name); // у точного паса outcome нет
      const key = Boolean(ev?.pass?.shot_assist || ev?.pass?.goal_assist);
      const cross = Boolean(ev?.pass?.cross);
      const toName = ev?.pass?.recipient?.name || undefined;

      const dx = (end[0] - loc[0]);
      const dy = (end[1] - loc[1]);
      const lenSB = Math.hypot(dx, dy);
      // приблизительный перевод в метры под 105x68
      const dxM = dx * (105 / 120);
      const dyM = dy * (68 / 80);
      const lenM = Math.hypot(dxM, dyM);

      rows.push({
        x1: loc[0], y1: loc[1],
        x2: end[0], y2: end[1],
        completed, key, cross,
        toName,
        minute: ev.minute ?? 0, second: ev.second ?? 0,
        lenSB, lenM,
      });
    }

    const flipped = autoFlip ? computeFlip(rows) : false;
    const mapX = (x: number) => (flipped ? 120 - x : x);

    const passes = rows.map(p => ({ ...p, x1: mapX(p.x1), x2: mapX(p.x2) }));
    return { passes, flipped };
  }, [raw, playerId, autoFlip]);
}
