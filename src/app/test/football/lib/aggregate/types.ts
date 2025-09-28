import type { SBEvent, PlayerAccum, TeamId } from "../../types/statsbomb";

/**
 * Набор опций (оставляем как было для совместимости).
 */
export type AggregationOptions = {
  sortKey: string;
  sortDir: "asc" | "desc";
  query: string;
};

export type LineupEntry = {
  id: number;
  name: string;
  position?: string;
  jersey?: number | null;
};

export type LineupMap = Map<
  TeamId,
  { teamName: string; formation?: number; players: Array<LineupEntry> }
>;

/**
 * Важно: здесь фиксируем реальные сигнатуры:
 * - teamDir: 1 | -1
 * - dist: принимает кортежи [number, number] (как в utils.dist)
 * - isFinalThird / isPenaltyArea / isProgressive: dir: 1 | -1
 */
export type AggregationState = {
  players: Map<string, PlayerAccum>; // key = `${teamId}:${playerId}`
  formations: Map<TeamId, number>;
  lineups: LineupMap;
  teamDir: Map<TeamId, 1 | -1>;
  matchEnd: number;
};

export type EventContext = {
  state: AggregationState;
  teamDir: Map<TeamId, 1 | -1>;
  updateMatchEnd: (minute: number) => void;
  helpers: {
    safeMinute: (e: SBEvent) => number;
    // уточняем вектора как кортежи; позволяем также обычные массивы для гибкости
    dist: (a?: [number, number] | number[] | undefined, b?: [number, number] | number[] | undefined) => number;
    isFinalThird: (x: number, dir: 1 | -1) => boolean;
    isPenaltyArea: (x: number, y: number, dir: 1 | -1) => boolean;
    isProgressive: (x0: number, x1: number, dir: 1 | -1) => boolean;
  };
};

export type EventHandler = (ev: SBEvent, p: PlayerAccum, ctx: EventContext) => void;
