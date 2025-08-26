export interface Enemy { id: number; x: number; y: number; hp: number; }
export interface Tower {
  id: number; x: number; y: number;
  level: number; hp: number; cooldownMs: number;
}
export interface Bullet { id: number; x: number; y: number; vx: number; vy: number; bornAt: number; }
export interface ScreenSize { width: number; height: number; }
export interface Point { x: number; y: number; }

export type WaveState = {
  current: number;         // индекс волны (0‑based)
  isActive: boolean;
  spawned: number;         // сколько уже заспавнили в текущей волне
};
