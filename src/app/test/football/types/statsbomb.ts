export type TeamId = number;
export type PlayerId = number;

/* ---- базовые ссылки ---- */
export interface SBTeamRef { id?: TeamId; name?: string }
export interface SBPlayerRef { id?: PlayerId; name?: string }

/* ---- геометрия ---- */
export type XY = [number, number];

/* ---- событие StatsBomb (минимально нужные поля строго типизированы) ---- */
export interface SBEvent {
  id?: string;
  index?: number;
  period?: number;
  timestamp?: string;
  minute?: number;
  second?: number;

  type?: { id?: number; name?: string };
  team?: SBTeamRef;
  player?: SBPlayerRef;
  position?: { id?: number; name?: string };

  // базовая геометрия по конвенции SB (120x80)
  location?: XY;
  end_location?: XY;
  duration?: number;
  related_events?: string[];
  under_pressure?: boolean;

  // тактика
  tactics?: {
    formation?: number;
    lineup?: Array<{
      player: { id: number; name: string };
      position: { id: number; name: string };
      jersey_number?: number;
    }>;
  };

  /* ---- загрузка полезных полей по типам ---- */

  // Pass: используем лишь то, что реально трогаем в коде
  pass?: {
    outcome?: { id?: number; name?: string } | null;
    end_location?: XY;
    length?: number;
    shot_assist?: boolean;
    goal_assist?: boolean;
    cross?: boolean;
    through_ball?: boolean;
    switch?: boolean;
    technique?: { id?: number; name?: string };
  } | any; // оставим any на случай редких полей

  // Shot: используем outcome/type/statsbomb_xg
  shot?: {
    outcome?: { id?: number; name?: string };
    end_location?: XY;
    statsbomb_xg?: number;
    xg?: number;
    type?: { id?: number; name?: string }; // Penalty и пр.
  } | any;

  dribble?: {
    outcome?: { id?: number; name?: string };
  } | any;

  duel?: {
    type?: { id?: number; name?: string }; // Tackle, Aerial и т.п.
    outcome?: { id?: number; name?: string };
  } | any;

  tackle?: any;
  goalkeeper?: any;

  substitution?: { replacement?: SBPlayerRef };

  // Carry (в SB это отдельный тип, иногда в кастомных — как поле)
  carry?: { end_location?: XY } | any;

  bad_behaviour?: { card?: { id?: number; name?: string } };
}

/* ---- аккумулятор по игроку ---- */
export interface PlayerAccum {
  teamId: TeamId;
  teamName: string;
  playerId: PlayerId;
  playerName: string;
  position?: string;
  jersey?: number | null;

  started: boolean;
  cameOnAt?: number;
  wentOffAt?: number;

  minutes: number; // обязательно

  // passing
  passesTotal: number;
  passesComplete: number;
  keyPasses: number;
  assists: number;
  crosses: number;
  crossesComplete: number;
  longPasses: number;
  throughBalls: number;
  switches: number;

  // shooting
  shotsTotal: number;
  shotsOnTarget: number;
  goals: number;
  xG: number;
  pensTaken: number;
  pensScored: number;

  // dribble/carry/receive
  dribblesAttempted: number;
  dribblesComplete: number;
  carries: number;
  carryDistance: number;
  receptions: number;

  // defense/duels
  duelsTotal: number;
  duelsWon: number;
  tackles: number;
  tacklesWon: number;
  interceptions: number;
  blocks: number;
  pressures: number;

  // discipline & misc
  foulsCommitted: number;
  foulsWon: number;
  yellow: number;
  red: number;
  recoveries: number;
  clearances: number;
  offsides: number;
  underPressureEvents: number;
  losses: number;

  // derived, coordinate-based
  passesIntoFinalThird: number;
  carriesIntoFinalThird: number;
  entriesPenaltyArea: number; // точные передачи в штрафную
  carriesIntoBox: number;
  progressivePasses: number;
  progressiveCarries: number;
}
