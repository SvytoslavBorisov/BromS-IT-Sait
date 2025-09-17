"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLeaderboard, submitScore, type LeaderboardEntry } from "../state/leaderboard";

export function useLeaderboard(difficulty: string, seed: string | number) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const reload = useCallback(() => {
    setEntries(getLeaderboard(difficulty, seed));
  }, [difficulty, seed]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback((entry: LeaderboardEntry) => {
    submitScore(difficulty, seed, entry);
    reload();
  }, [difficulty, seed, reload]);

  return { entries, add, reload };
}
