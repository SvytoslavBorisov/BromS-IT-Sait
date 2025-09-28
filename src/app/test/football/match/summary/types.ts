// Минимальные типы для сводки

export type SBEvent = {
  team?: { id?: number; name?: string };
  type?: { name?: string };
  shot?: {
    outcome?: { name?: string };
    statsbomb_xg?: number;
    xg?: number;
    is_goal?: boolean;
  };
  pass?: {
    outcome?: { name?: string } | null;
    length?: number;
  };
  foul_committed?: unknown;
  bad_behaviour?: unknown;
  card?: { name?: string } | { type?: { name?: string } } | string;
};

export type Pair = { left: number; right: number };

export type MatchSummaryProps = {
  left?: import("../../lib/positions").TeamLineup;
  right?: import("../../lib/positions").TeamLineup;
  leftId?: number;
  rightId?: number;
  leftLabel?: string;
  rightLabel?: string;
};
