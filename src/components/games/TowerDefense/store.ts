"use client";
import { create } from "zustand";
import { Enemy, Tower, Bullet, WaveState, Point } from "./types";
import {
  ENEMY_REWARD, TOWER_BASE_COOLDOWN_MS, TOWER_BASE_DAMAGE, TOWER_BASE_RANGE,
  DAMAGE_PER_LEVEL, RANGE_PER_LEVEL, COOLDOWN_REDUCE_PER_LEVEL, TOWER_COST, TOWER_SELL_REFUND,
  UPGRADE_COST_BASE, UPGRADE_COST_GROWTH
} from "./config";
import { roundMoney } from "./math";

type GameState = {
  enemies: Enemy[];
  towers: Tower[];
  bullets: Bullet[];
  gold: number;
  lives: number;
  paused: boolean;
  selectedTowerId: number | null;
  wave: WaveState;
  center: Point;                   // задаём извне на каждом ререндере

  // вычисления для башни
  towerRange: (t: Tower) => number;
  towerDamage: (t: Tower) => number;
  towerCooldown: (t: Tower) => number;
  upgradeCost: (level: number) => number;

  // мутации
  setCenter: (p: Point) => void;
  addEnemy: (e: Enemy) => void;
  setEnemies: (fn: (prev: Enemy[]) => Enemy[]) => void;
  setTowers: (fn: (prev: Tower[]) => Tower[]) => void;
  setBullets: (fn: (prev: Bullet[]) => Bullet[]) => void;

  addGold: (v: number) => void;
  loseLife: (n: number) => void;
  togglePause: () => void;

  placeTower: (x: number, y: number) => void;
  selectTower: (id: number | null) => void;
  sellSelectedTower: () => void;
  upgradeSelectedTower: () => void;

  enemyKilledReward: (kills: number) => void;

  waveStart: () => void;
  waveEndIfCleared: () => void; // проверка конца волны
  waveSpawnedInc: () => void;
  waveResetSpawned: () => void;
};

export const useGameStore = create<GameState>((set, get) => ({
  enemies: [],
  towers: [],
  bullets: [],
  gold: 120,
  lives: 10,
  paused: false,
  selectedTowerId: null,
  wave: { current: 0, isActive: false, spawned: 0 },
  center: { x: 0, y: 0 },

  towerRange: (t) => TOWER_BASE_RANGE + RANGE_PER_LEVEL * (t.level - 1),
  towerDamage: (t) => TOWER_BASE_DAMAGE + DAMAGE_PER_LEVEL * (t.level - 1),
  towerCooldown: (t) => Math.max(160, TOWER_BASE_COOLDOWN_MS - COOLDOWN_REDUCE_PER_LEVEL * (t.level - 1)),
  upgradeCost: (level) => roundMoney(UPGRADE_COST_BASE * Math.pow(UPGRADE_COST_GROWTH, level - 1)),

  setCenter: (p) => set({ center: p }),
  addEnemy: (e) => set(state => ({ enemies: [...state.enemies, e] })),
  setEnemies: (fn) => set(state => ({ enemies: fn(state.enemies) })),
  setTowers: (fn) => set(state => ({ towers: fn(state.towers) })),
  setBullets: (fn) => set(state => ({ bullets: fn(state.bullets) })),

  addGold: (v) => set(state => ({ gold: state.gold + v })),
  loseLife: (n) => set(state => ({ lives: Math.max(0, state.lives - n) })),
  togglePause: () => set(state => ({ paused: !state.paused })),

  placeTower: (x, y) => set(state => {
    if (state.gold < TOWER_COST) return state;
    const id = Date.now();
    return {
      towers: [...state.towers, { id, x, y, level: 1, hp: 5, cooldownMs: 0 }],
      gold: state.gold - TOWER_COST,
      selectedTowerId: id,
    };
  }),

  selectTower: (id) => set({ selectedTowerId: id }),

  sellSelectedTower: () => set(state => {
    const id = state.selectedTowerId;
    if (!id) return state;
    const t = state.towers.find(x => x.id === id);
    if (!t) return { ...state, selectedTowerId: null };
    // цена продажи = базовая цена + сумма апгрейдов * коэффициент возврата
    // грубо: towerValue ≈ TOWER_COST + сумма стоимостей уровней <level>
    let value = TOWER_COST;
    for (let lvl = 1; lvl < t.level; lvl++) {
      value += Math.round(UPGRADE_COST_BASE * Math.pow(UPGRADE_COST_GROWTH, lvl - 1));
    }
    const refund = roundMoney(value * TOWER_SELL_REFUND);
    return {
      towers: state.towers.filter(x => x.id !== id),
      selectedTowerId: null,
      gold: state.gold + refund,
    };
  }),

  upgradeSelectedTower: () => set(state => {
    const id = state.selectedTowerId;
    if (!id) return state;
    const idx = state.towers.findIndex(x => x.id === id);
    if (idx === -1) return state;
    const t = state.towers[idx];
    const cost = get().upgradeCost(t.level);
    if (state.gold < cost) return state;
    const next = state.towers.slice();
    next[idx] = { ...t, level: t.level + 1 };
    return { towers: next, gold: state.gold - cost };
  }),

  enemyKilledReward: (kills) => set(state => ({ gold: state.gold + kills * ENEMY_REWARD })),

  waveStart: () => set(state => ({ wave: { current: state.wave.current, isActive: true, spawned: 0 } })),
  waveEndIfCleared: () => set(state => {
    if (!state.wave.isActive) return state;
    if (state.enemies.length === 0 && state.bullets.length === 0) {
      // перейти к следующей волне
      return { wave: { current: state.wave.current + 1, isActive: false, spawned: 0 } };
    }
    return state;
  }),
  waveSpawnedInc: () => set(state => ({ wave: { ...state.wave, spawned: state.wave.spawned + 1 } })),
  waveResetSpawned: () => set(state => ({ wave: { ...state.wave, spawned: 0 } })),
}));
