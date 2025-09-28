import type { SBEvent } from "../../types/statsbomb";
import { safeMinute, dist, isFinalThird, isPenaltyArea, isProgressive } from "../utils";
import { createEmptyState, seedStartingXI, applySubstitutions, ensurePlayer, setTeamDirections } from "./init";
import type { AggregationOptions, EventContext } from "./types";
import { getDefaultRegistry } from "./registry";
import { finalizeMinutes } from "./minutes";
import { buildByTeam, buildExportRows } from "./export";

export function aggregate(events: SBEvent[], _opts: AggregationOptions) {
  const state = createEmptyState();

  // 1) составы
  seedStartingXI(events, state);

  // 2) замены
  applySubstitutions(events, state);

  // 3) направления атаки
  setTeamDirections(events, state);

  // 4) обработчики
  const handlers = getDefaultRegistry();

  const ctx: EventContext = {
    state,
    teamDir: state.teamDir,
    updateMatchEnd: (m) => { if (m > state.matchEnd) state.matchEnd = m; },
    // ВАЖНО: сигнатуры хелперов теперь совместимы с utils.*
    helpers: { safeMinute, dist, isFinalThird, isPenaltyArea, isProgressive },
  };

  for (const ev of events) {
    const minute = safeMinute(ev);
    ctx.updateMatchEnd(minute);

    const p = ensurePlayer(state, ev);
    if (!p) continue;

    if (ev.under_pressure) p.underPressureEvents += 1;

    const t = ev?.type?.name;
    if (!t) continue;
    const handler = handlers[t];
    if (handler) handler(ev, p, ctx);
  }

  // 5) минуты
  finalizeMinutes(state);

  // 6) группировка/экспорт
  const byTeam = buildByTeam(state);
  const exportRows = buildExportRows(state);

  return { byTeam, formations: state.formations, lineups: state.lineups, exportRows };
}
