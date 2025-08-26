"use client";
import { useEffect, useRef } from "react";
import type { Enemy, Tower, Bullet, Point } from "../types";
import {
  BASE_RADIUS, BULLET_RADIUS, BULLET_SPEED, BULLET_TTL_MS,
  ENEMY_MOVE_SPEED, ENEMY_RADIUS, TICK_MS, TOWER_COOLDOWN_MS, TOWER_DAMAGE, TOWER_RANGE
} from "../config";
import { clamp, dist2 } from "../math";

/** Главный игровой цикл: движение врагов, выстрелы башен, полёт пуль, урон/золото */
export function useGameTick(
  center: Point,
  enemies: Enemy[],
  setEnemies: React.Dispatch<React.SetStateAction<Enemy[]>>,
  towers: Tower[],
  setTowers: React.Dispatch<React.SetStateAction<Tower[]>>,
  setBullets: React.Dispatch<React.SetStateAction<Bullet[]>>,
  setGold: React.Dispatch<React.SetStateAction<number>>,
  setLives: React.Dispatch<React.SetStateAction<number>>
) {
  const idSeq = useRef(10_000);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTime = performance.now();

    tickRef.current = window.setInterval(() => {
      const now = performance.now();
      const dtMs = now - lastTime;
      lastTime = now;

      // 1) Враги двигаются к базе
      setEnemies(prev => {
        const next: Enemy[] = [];
        let livesLost = 0;

        for (const e of prev) {
          const dx = center.x - e.x;
          const dy = center.y - e.y;
          const d = Math.hypot(dx, dy) || 1;
          const nx = e.x + (dx / d) * ENEMY_MOVE_SPEED;
          const ny = e.y + (dy / d) * ENEMY_MOVE_SPEED;

          if (Math.hypot(center.x - nx, center.y - ny) <= BASE_RADIUS) {
            livesLost += 1;
            continue;
          }
          next.push({ ...e, x: nx, y: ny });
        }

        if (livesLost > 0) setLives(l => clamp(l - livesLost, 0, 999));
        return next;
      });

      // 2) Башни: поиск цели и выстрел
      setTowers(prevTowers => {
        const enemiesSnapshot = enemies;
        const newBullets: Bullet[] = [];

        const updated = prevTowers.map(t => {
          const cooldown = Math.max(0, t.cooldownMs - dtMs);

          // ближайшая цель в радиусе
          let target: Enemy | null = null;
          let bestD2 = Infinity;
          for (const e of enemiesSnapshot) {
            const d2 = dist2(t.x, t.y, e.x, e.y);
            if (d2 <= TOWER_RANGE * TOWER_RANGE && d2 < bestD2) {
              bestD2 = d2; target = e;
            }
          }

          if (cooldown <= 0 && target) {
            const dx = target.x - t.x;
            const dy = target.y - t.y;
            const d = Math.hypot(dx, dy) || 1;
            const vx = (dx / d) * BULLET_SPEED;
            const vy = (dy / d) * BULLET_SPEED;

            newBullets.push({
              id: idSeq.current++,
              x: t.x, y: t.y,
              vx, vy,
              bornAt: now,
            });

            return { ...t, cooldownMs: TOWER_COOLDOWN_MS };
          }

          return { ...t, cooldownMs: cooldown };
        });

        if (newBullets.length) setBullets(prev => [...prev, ...newBullets]);
        return updated;
      });

      // 3) Пули: полёт и попадания
      setBullets(prevBullets => {
        if (prevBullets.length === 0) return prevBullets;

        let bulletsNext: Bullet[] = [];
        let enemiesNext = enemies.slice();
        let kills = 0;
        let anyHit = false;

        for (const b of prevBullets) {
          const age = now - b.bornAt;
          if (age > BULLET_TTL_MS) continue;

          const nx = b.x + b.vx;
          const ny = b.y + b.vy;

          // столкновение
          let hitIndex = -1;
          for (let i = 0; i < enemiesNext.length; i++) {
            const e = enemiesNext[i];
            const d = Math.hypot(nx - e.x, ny - e.y);
            if (d <= ENEMY_RADIUS + BULLET_RADIUS) { hitIndex = i; break; }
          }

          if (hitIndex !== -1) {
            anyHit = true;
            const e = enemiesNext[hitIndex];
            const newHp = e.hp - TOWER_DAMAGE;
            if (newHp <= 0) { enemiesNext.splice(hitIndex, 1); kills += 1; }
            else { enemiesNext[hitIndex] = { ...e, hp: newHp }; }
            continue; // пуля исчезает
          }

          bulletsNext.push({ ...b, x: nx, y: ny });
        }

        if (anyHit || kills > 0) setEnemies(() => enemiesNext);
        if (kills > 0) setGold(g => g + kills * 2);

        return bulletsNext;
      });

    }, TICK_MS);

    return () => { if (tickRef.current !== null) clearInterval(tickRef.current); };
  }, [center, enemies, setEnemies, towers, setTowers, setBullets, setGold, setLives]);
}
