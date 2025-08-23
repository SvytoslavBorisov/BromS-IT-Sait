"use client";

import { useEffect, useState } from "react";

export type DkgState = {
  ses: { id: string; n: number; t: number; epoch: string } | null;
  parts: any[];
  cmts: any[];
  outbox: any[];
  ready: any[];
};

export function useDkgPolling(roomId: string, intervalMs = 1200) {
  const [state, setState] = useState<DkgState>({ ses: null, parts: [], cmts: [], outbox: [], ready: [] });

  useEffect(() => {
    let stop = false;
    (async () => {
      while (!stop) {
        try {
          const st = await fetch(`/api/dkg/sessions/${roomId}/state`, { cache: "no-store" }).then(r => r.json());
          setState(st);
        } catch { /* ignore */ }
        await new Promise(res => setTimeout(res, intervalMs));
      }
    })();
    return () => { stop = true; };
  }, [roomId, intervalMs]);

  return state;
}
