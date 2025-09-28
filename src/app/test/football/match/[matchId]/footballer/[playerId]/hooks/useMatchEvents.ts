"use client";

import { useEffect, useState } from "react";
import type { SBEvent } from "../../../../../types/statsbomb";

export function useMatchEvents(matchId: string) {
  const [data, setData] = useState<SBEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setData(null);

        const res = await fetch(`/api/football/matches/${encodeURIComponent(matchId)}`, {
          cache: "no-store",
          signal: ac.signal,
        });

        if (ac.signal.aborted) return;

        if (res.status === 404) {
          setError("Матч не найден");
        } else if (!res.ok) {
          setError(`Ошибка сервера: ${res.status}`);
        } else {
          const json = (await res.json()) as SBEvent[];
          if (!ac.signal.aborted) setData(json);
        }
      } catch (e: any) {
        if (!ac.signal.aborted) setError(e?.message || "Ошибка сети");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [matchId]);

  return { data, error, loading };
}
