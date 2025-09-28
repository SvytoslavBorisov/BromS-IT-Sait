import type { AggregationState } from "./types";

export function finalizeMinutes(state: AggregationState) {
  for (const p of state.players.values()) {
    const start = p.cameOnAt ?? 0;
    const end = p.wentOffAt ?? state.matchEnd;
    p.minutes = Math.max(0, Math.round(end - start));
  }
}
