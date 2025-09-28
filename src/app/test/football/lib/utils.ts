import { SBEvent, PlayerAccum } from "../types/statsbomb";

/** Слияние классов (truthy only). */
export const cx = (...cls: (string | false | null | undefined)[]) =>
  cls.filter(Boolean).join(" ");

/** Константы площадки StatsBomb (метры). */
export const PITCH = {
  LENGTH: 120,
  WIDTH: 80,
  PENALTY_X_FROM_HOME: 18,   // глубина штрафной от своей линии
  PENALTY_WIDTH_MIN: 18,
  PENALTY_WIDTH_MAX: 62,
  FINAL_THIRD_X_HOME: 40,    // треть от своих ворот
  FINAL_THIRD_X_AWAY: 80,    // треть у чужих ворот
} as const;

export type Dir = 1 | -1; // направление атаки (вправо или влево)
export type XY = [number, number];

/** Безопасная минута (мин + сек/60). */
export function safeMinute(e?: SBEvent): number {
  const m = e?.minute ?? 0;
  const s = e?.second ?? 0;
  return m + s / 60;
}

/** Привести массив координат к кортежу XY (если можно). */
function toXY(a?: [number, number] | number[] | null): XY | null {
  if (!a || a.length < 2) return null;
  const x = Number(a[0]);
  const y = Number(a[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y];
}

/** Евклидово расстояние между двумя точками (координаты в метрах). */
export function dist(
  a?: [number, number] | number[],
  b?: [number, number] | number[]
): number {
  const aa = toXY(a);
  const bb = toXY(b);
  if (!aa || !bb) return 0;
  const dx = bb[0] - aa[0];
  const dy = bb[1] - aa[1];
  return Math.hypot(dx, dy);
}

export function isSaved(outcome?: string) {
  return !!outcome && outcome.toLowerCase().startsWith("saved");
}

export function isOnTarget(outcome?: string) {
  const o = (outcome || "").toLowerCase();
  return o === "goal" || isSaved(o);
}

export function round(x: number, d = 3) {
  const k = Math.pow(10, d);
  return Math.round((x ?? 0) * k) / k;
}

export function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}

/** CSV-join с экранированием. */
export function csvJoin(arr: any[]) {
  return arr
    .map((x) => {
      const s = String(x ?? "");
      return s.includes(",") || s.includes("\n") || s.includes('"')
        ? '"' + s.replace(/"/g, '""') + '"'
        : s;
    })
    .join(",");
}

/** Базовый объект на игрока. */
export function basePlayer(
  teamId: number,
  teamName: string,
  pid: number,
  pname?: string,
  position?: string,
  jersey: number | null = null
): PlayerAccum {
  return {
    teamId,
    teamName,
    playerId: pid,
    playerName: pname || `Player ${pid}`,
    position,
    jersey,
    started: false,
    cameOnAt: 0,
    wentOffAt: undefined,
    minutes: 0, // обязательно инициализируем

    // passing
    passesTotal: 0,
    passesComplete: 0,
    keyPasses: 0,
    assists: 0,
    crosses: 0,
    crossesComplete: 0,
    longPasses: 0,
    throughBalls: 0,
    switches: 0,

    // shooting
    shotsTotal: 0,
    shotsOnTarget: 0,
    goals: 0,
    xG: 0,
    pensTaken: 0,
    pensScored: 0,

    // dribble/carry/receive
    dribblesAttempted: 0,
    dribblesComplete: 0,
    carries: 0,
    carryDistance: 0,
    receptions: 0,

    // defense/duels
    duelsTotal: 0,
    duelsWon: 0,
    tackles: 0,
    tacklesWon: 0,
    interceptions: 0,
    blocks: 0,
    pressures: 0,

    // discipline & misc
    foulsCommitted: 0,
    foulsWon: 0,
    yellow: 0,
    red: 0,
    recoveries: 0,
    clearances: 0,
    offsides: 0,
    underPressureEvents: 0,
    losses: 0,

    // derived
    passesIntoFinalThird: 0,
    carriesIntoFinalThird: 0,
    entriesPenaltyArea: 0,
    carriesIntoBox: 0,
    progressivePasses: 0,
    progressiveCarries: 0,
  };
}

/* ===== Геометрия/направление ===== */

export function inRange(x: number, a: number, b: number) {
  return x >= Math.min(a, b) && x <= Math.max(a, b);
}

/**
 * Определение направления атаки команды.
 * Возвращает Map<teamId, 1 | -1>.
 */
export function inferTeamDirections(events: SBEvent[]): Map<number, Dir> {
  const dirs = new Map<number, Dir>();
  const byTeam: Record<number, { shotsX: number[]; passDx: number[] }> = {};
  for (const ev of events) {
    const tid = ev.team?.id;
    if (!tid) continue;
    byTeam[tid] ||= { shotsX: [], passDx: [] };

    if (ev.type?.name === "Shot") {
      const x = ev.shot?.end_location?.[0] ?? ev.location?.[0];
      if (typeof x === "number") byTeam[tid].shotsX.push(x);
    } else if (ev.type?.name === "Pass") {
      const x0 = ev.location?.[0];
      const x1 = ev.pass?.end_location?.[0];
      if (typeof x0 === "number" && typeof x1 === "number") {
        byTeam[tid].passDx.push(x1 - x0);
      }
    }
  }

  for (const [tidStr, v] of Object.entries(byTeam)) {
    const tid = Number(tidStr);
    if (v.shotsX.length) {
      const mx = v.shotsX.reduce((a, b) => a + b, 0) / v.shotsX.length;
      dirs.set(tid, mx >= PITCH.LENGTH / 2 ? 1 : -1);
    } else if (v.passDx.length) {
      const mdx = v.passDx.reduce((a, b) => a + b, 0) / v.passDx.length;
      dirs.set(tid, mdx >= 0 ? 1 : -1);
    } else {
      dirs.set(tid, 1);
    }
  }
  return dirs;
}

/** Попадание в финальную треть с учётом направления. */
export function isFinalThird(x: number, dir: Dir): boolean {
  return dir === 1 ? x >= PITCH.FINAL_THIRD_X_AWAY : x <= PITCH.FINAL_THIRD_X_HOME;
}

/** Попадание в штрафную с учётом направления. */
export function isPenaltyArea(x: number, y: number, dir: Dir): boolean {
  const inY = inRange(y, PITCH.PENALTY_WIDTH_MIN, PITCH.PENALTY_WIDTH_MAX);
  return dir === 1 ? x >= PITCH.LENGTH - PITCH.PENALTY_X_FROM_HOME && inY : x <= PITCH.PENALTY_X_FROM_HOME && inY;
}

/** Компонента продвижения к воротам по оси X с учётом направления. */
export function towardGoalDelta(x0: number, x1: number, dir: Dir): number {
  return (x1 - x0) * dir;
}

/** Прогрессивность перемещения по X с адаптивным порогом. */
export function isProgressive(x0: number, x1: number, dir: Dir): boolean {
  const goalX = dir === 1 ? PITCH.LENGTH : 0;
  const remaining = Math.max(0, Math.abs(goalX - x0));
  const toward = towardGoalDelta(x0, x1, dir);
  return toward >= Math.max(10, 0.25 * remaining);
}
