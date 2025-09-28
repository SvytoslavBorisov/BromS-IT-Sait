import type { AggregationState } from "./types";
import type { PlayerAccum, TeamId } from "../../types/statsbomb";

export function buildByTeam(state: AggregationState) {
  const byTeam = new Map<TeamId, PlayerAccum[]>();
  for (const p of state.players.values()) {
    if (!byTeam.has(p.teamId)) byTeam.set(p.teamId, []);
    byTeam.get(p.teamId)!.push(p);
  }
  for (const list of byTeam.values()) {
    list.sort((a, b) => (a.playerName || "").localeCompare(b.playerName || ""));
  }
  return byTeam;
}

export function buildExportRows(state: AggregationState) {
  const exportRows: any[] = [];
  for (const p of state.players.values()) {
    exportRows.push([
      p.teamName, p.playerName, p.position ?? "", p.jersey ?? "",
      p.started ? "Y" : "N", p.cameOnAt ?? "", p.wentOffAt ?? "", p.minutes,
      p.passesTotal, p.passesComplete, p.keyPasses, p.assists, p.crosses, p.crossesComplete, p.longPasses, p.throughBalls, p.switches,
      p.shotsTotal, p.shotsOnTarget, p.goals, p.xG, p.pensTaken, p.pensScored,
      p.dribblesAttempted, p.dribblesComplete, p.carries, p.carryDistance.toFixed(1), p.receptions,
      p.duelsTotal, p.duelsWon, p.tackles, p.tacklesWon, p.interceptions, p.blocks, p.pressures,
      p.foulsCommitted, p.foulsWon, p.yellow, p.red, p.recoveries, p.clearances, p.offsides, p.underPressureEvents, p.losses,
      p.passesIntoFinalThird, p.carriesIntoFinalThird, p.entriesPenaltyArea, p.carriesIntoBox, p.progressivePasses, p.progressiveCarries,
    ]);
  }
  return exportRows;
}
