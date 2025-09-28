export type StatLine = {
  pace: number;
  pass: number;
  shot: number;
  dribble: number;
  defense: number;
  stamina: number;
};

export type PlayerSnapshot = {
  id: number;
  name: string;
  position: string;
  stats: StatLine;
};

export type PassContext = {
  passer: PlayerSnapshot;
  receiver: PlayerSnapshot;
  pressure: number; // 0..1
  distance: number; // метры
};

export type ShotContext = {
  shooter: PlayerSnapshot;
  distance: number; // м
  angle: number;    // 0..1 (0 — острый угол, 1 — центр ворот)
  pressure: number; // 0..1
};

export type ShotOutcome = {
  xg: number;       // голевой ожидаемый шанс
  isGoal: boolean;
};
