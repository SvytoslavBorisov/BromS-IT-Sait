/** Баланс и параметры игры */
export const ENEMY_MOVE_SPEED = 1.6;
export const ENEMY_HP_BASE = 2;          // базовое HP врага на волне 1
export const ENEMY_RADIUS = 10;
export const ENEMY_REWARD = 2;           // золото за убийство

export const TOWER_COST = 20;
export const TOWER_SELL_REFUND = 0.6;    // % возврата при продаже
export const TOWER_BASE_RANGE = 130;
export const TOWER_BASE_COOLDOWN_MS = 700;
export const TOWER_BASE_DAMAGE = 1;

export const UPGRADE_COST_BASE = 25;     // цена апгрейда уровней 1→2→3...
export const UPGRADE_COST_GROWTH = 1.7;  // множитель цены
export const DAMAGE_PER_LEVEL = 0.7;     // +к базовому урону за уровень
export const RANGE_PER_LEVEL = 16;       // +к радиусу за уровень (px)
export const COOLDOWN_REDUCE_PER_LEVEL = 40; // −мс за уровень

export const BULLET_SPEED = 6.5;
export const BULLET_TTL_MS = 4000;
export const BULLET_RADIUS = 4;

export const BASE_RADIUS = 22;
export const TICK_MS = 16; // ~60 FPS

/** Конфиг волн: сколько врагов, интервал спавна (мс), бонус золота */
export const WAVES = [
  { count: 10, interval: 550, bonus: 20, hpMul: 1.0 },
  { count: 14, interval: 500, bonus: 30, hpMul: 1.2 },
  { count: 18, interval: 450, bonus: 40, hpMul: 1.4 },
  { count: 24, interval: 420, bonus: 60, hpMul: 1.7 },
  { count: 32, interval: 380, bonus: 80, hpMul: 2.0 },
] as const;
