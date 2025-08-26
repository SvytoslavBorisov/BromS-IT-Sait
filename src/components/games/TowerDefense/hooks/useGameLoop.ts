"use client";
import { useEffect, useRef } from "react";
import { useGameStore } from "../store";
import {
  BASE_RADIUS, BULLET_RADIUS, BULLET_SPEED, BULLET_TTL_MS,
  ENEMY_MOVE_SPEED, ENEMY_RADIUS, ENEMY_REWARD, TICK_MS
} from "../config";
import { dist2 } from "../math";
import { WAVES } from "../config"; 
export function useGameLoop() {
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    let last = performance.now();

    tickRef.current = window.setInterval(() => {
      const now = performance.now();
      const dtMs = now - last; last = now;

      const s = useGameStore.getState();
      if (s.paused) return;

      const { center } = s;

      // ---------- 1) ДВИЖЕНИЕ ВРАГОВ ----------
      const enemiesMoved = [] as typeof s.enemies;
      let livesLost = 0;

      for (const e of s.enemies) {
        const dx = center.x - e.x;
        const dy = center.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        const nx = e.x + (dx / d) * ENEMY_MOVE_SPEED;
        const ny = e.y + (dy / d) * ENEMY_MOVE_SPEED;

        if (Math.hypot(center.x - nx, center.y - ny) <= BASE_RADIUS) {
          livesLost += 1;
        } else {
          enemiesMoved.push({ ...e, x: nx, y: ny });
        }
      }

      // ---------- 2) БАШНИ: КД, ПОИСК ЦЕЛИ, ПУЛИ ----------
      const newBullets = [] as typeof s.bullets;
      const towersUpdated = s.towers.map(t => {
        const cd = Math.max(0, t.cooldownMs - dtMs);

        // ближайший враг в радиусе
        let target: { x: number; y: number } | null = null;
        let best = Infinity;
        const range = useGameStore.getState().towerRange(t);
        for (const e of enemiesMoved) {
          const d2 = dist2(t.x, t.y, e.x, e.y);
          if (d2 <= range * range && d2 < best) { best = d2; target = e; }
        }

        if (cd <= 0 && target) {
          const dx = target.x - t.x;
          const dy = target.y - t.y;
          const d = Math.hypot(dx, dy) || 1;
          newBullets.push({
            id: Date.now() + Math.random(),
            x: t.x, y: t.y,
            vx: (dx / d) * BULLET_SPEED,
            vy: (dy / d) * BULLET_SPEED,
            bornAt: now,
          });
          return { ...t, cooldownMs: useGameStore.getState().towerCooldown(t) };
        }
        return { ...t, cooldownMs: cd };
      });

      // ---------- 3) ПУЛИ: ПОЛЁТ И ПОПАДАНИЯ ----------
      // работаем со старыми пулями + новыми выстрелами
      const bulletsStart = s.bullets.concat(newBullets);

      const bulletsNext = [] as typeof s.bullets;
      const enemiesAfterBullets = enemiesMoved.slice();
      let kills = 0;

      for (const b of bulletsStart) {
        const age = now - b.bornAt;
        if (age > BULLET_TTL_MS) continue;

        const nx = b.x + b.vx;
        const ny = b.y + b.vy;

        // столкновение с ближайшим врагом
        let hitIdx = -1;
        for (let i = 0; i < enemiesAfterBullets.length; i++) {
          const e = enemiesAfterBullets[i];
          const d = Math.hypot(nx - e.x, ny - e.y);
          if (d <= ENEMY_RADIUS + BULLET_RADIUS) { hitIdx = i; break; }
        }

        if (hitIdx !== -1) {
          // урон берём от ближайшей башни (влияют апгрейды)
          let minD2 = Infinity, dmg = 1;
          for (const t of towersUpdated) {
            const d2 = dist2(t.x, t.y, nx, ny);
            if (d2 < minD2) { minD2 = d2; dmg = useGameStore.getState().towerDamage(t); }
          }

          const e = enemiesAfterBullets[hitIdx];
          const hp2 = e.hp - dmg;
          if (hp2 <= 0) { enemiesAfterBullets.splice(hitIdx, 1); kills += 1; }
          else { enemiesAfterBullets[hitIdx] = { ...e, hp: hp2 }; }
          continue; // пуля исчезает
        }

        bulletsNext.push({ ...b, x: nx, y: ny });
      }

      // ---------- 4) АТОМАРНО ОБНОВЛЯЕМ СТОР ----------
      useGameStore.setState(state => ({
        enemies: enemiesAfterBullets,
        towers: towersUpdated,
        bullets: bulletsNext,
        lives: Math.max(0, state.lives - livesLost),
        gold: state.gold + kills * ENEMY_REWARD,
      }));

        const st = useGameStore.getState();
        const waveCfg = WAVES[st.wave.current] ?? WAVES[WAVES.length - 1];
        const allSpawned = st.wave.spawned >= waveCfg.count;
        const noEnemies = enemiesAfterBullets.length === 0;
        const noBullets = bulletsNext.length === 0;

        if (st.wave.isActive && allSpawned && noEnemies && noBullets) {
        useGameStore.setState(s => ({
            wave: { current: s.wave.current, isActive: false, spawned: 0 }
        }));
        }

      // конец тика
    }, TICK_MS);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);
}
