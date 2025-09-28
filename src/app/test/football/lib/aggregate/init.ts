import { SBEvent, PlayerAccum, TeamId } from "../../types/statsbomb";
import { basePlayer, safeMinute, inferTeamDirections } from "../utils";
import type { AggregationState } from "./types";

export function createEmptyState(): AggregationState {
  return {
    players: new Map<string, PlayerAccum>(),
    formations: new Map<TeamId, number>(),
    lineups: new Map<TeamId, { teamName: string; formation?: number; players: Array<{ id: number; name: string; position?: string; jersey?: number | null }> }>(),
    teamDir: new Map<TeamId, 1 | -1>(),
    matchEnd: 0,
  };
}

export function seedStartingXI(events: SBEvent[], state: AggregationState) {
  for (const ev of events) {
    if (ev?.type?.name !== "Starting XI") continue;

    const teamId = ev.team?.id ?? 0;
    const teamName = ev.team?.name ?? "Unknown Team";
    if (ev.tactics?.formation) state.formations.set(teamId, ev.tactics.formation);

    const lu = {
      teamName,
      formation: ev.tactics?.formation,
      players: [] as Array<{ id: number; name: string; position?: string; jersey?: number | null }>,
    };

    for (const item of ev.tactics?.lineup || []) {
      const pid = item.player.id;
      const key = `${teamId}:${pid}`;
      const p = basePlayer(
        teamId,
        teamName,
        pid,
        item.player.name,
        item.position?.name,
        item.jersey_number ?? null
      ) as PlayerAccum;
      p.started = true;
      p.minutes = 0;
      state.players.set(key, p);

      lu.players.push({
        id: pid,
        name: item.player.name,
        position: item.position?.name,
        jersey: item.jersey_number ?? null,
      });
    }
    state.lineups.set(teamId, lu);
  }
}

export function applySubstitutions(events: SBEvent[], state: AggregationState) {
  for (const ev of events) {
    if (
      ev?.type?.name === "Substitution" &&
      ev.team?.id &&
      (ev.player?.id || ev.substitution?.replacement?.id)
    ) {
      const teamId = ev.team.id;
      const teamName = ev.team.name ?? "Unknown Team";
      const minute = safeMinute(ev);

      // ушёл
      const outId = ev.player?.id;
      if (outId) {
        const ko = `${teamId}:${outId}`;
        const outP = state.players.get(ko);
        if (outP) {
          outP.wentOffAt = minute;
        } else {
          const created = basePlayer(teamId, teamName, outId, ev.player?.name, ev.position?.name) as PlayerAccum;
          created.wentOffAt = minute;
          created.minutes = 0;
          state.players.set(ko, created);
        }
      }

      // вышел
      const inId = ev.substitution?.replacement?.id;
      if (inId) {
        const ki = `${teamId}:${inId}`;
        let inP = state.players.get(ki);
        if (!inP) {
          inP = basePlayer(teamId, teamName, inId, ev.substitution?.replacement?.name) as PlayerAccum;
          inP.minutes = 0;
          state.players.set(ki, inP);
        }
        inP.started = false;
        inP.cameOnAt = minute;
      }
    }
  }
}

export function ensurePlayer(state: AggregationState, ev: SBEvent): PlayerAccum | null {
  const teamId = ev.team?.id ?? 0;
  const teamName = ev.team?.name ?? "Unknown Team";
  const pid = ev.player?.id as number | undefined;
  if (typeof pid !== "number") return null;

  const key = `${teamId}:${pid}`;
  if (!state.players.has(key)) {
    const created = basePlayer(teamId, teamName, pid, ev.player?.name, ev.position?.name) as PlayerAccum;
    created.minutes = 0;
    state.players.set(key, created);
  }
  return state.players.get(key)!;
}

export function setTeamDirections(events: SBEvent[], state: AggregationState) {
  // inferTeamDirections уже возвращает 1 | -1, просто присваиваем.
  state.teamDir = inferTeamDirections(events) as Map<TeamId, 1 | -1>;
}
