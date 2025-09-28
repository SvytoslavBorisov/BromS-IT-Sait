"use client";
import { useMemo } from "react";
import { aggregate } from "../lib/aggregate";
import type { SBEvent, PlayerAccum, TeamId } from "../types/statsbomb";

type Opts = { sortKey: string; sortDir: "asc" | "desc"; query: string };

export function useStatsbomb(raw: SBEvent[] | null, opts: Opts) {
  return useMemo(() => {
    if (!raw) {
      return {
        teams: new Map<TeamId, PlayerAccum[]>(),
        teamsOrder: [] as TeamId[],
        formations: new Map<TeamId, number>(),
        lineups: new Map<TeamId, { teamName: string; formation?: number; players: Array<{ id: number; name: string; position?: string; jersey?: number | null }> }>(),
        exportRows: [] as any[],
      };
    }

    const { byTeam, formations, lineups, exportRows } = aggregate(raw, opts);

    const teamsOrder = Array.from(byTeam.keys());
    return { teams: byTeam, teamsOrder, formations, lineups, exportRows };
  }, [raw, opts.sortKey, opts.sortDir, opts.query]);
}
