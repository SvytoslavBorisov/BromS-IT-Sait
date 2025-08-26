"use client";

import React, { useEffect, useRef } from "react";

/**
 * Top‑Down 2D Action (/topdown)
 * 
 * ✔ Стрелки — движение (WASD тоже поддержаны)
 * ✔ ЛКМ — удар по сектору (с короткой анимацией «свиша»)
 * ✔ E — подобрать ближайший предмет (еда/аптечка)
 * ✔ ВЛЕВО ВВЕРХУ — полосы HP и Голод (цвет плавно от зелёного к красному)
 * ✔ ВПРАВО ВВЕРХУ — миникарта с игроком, врагами, предметами
 * ✔ Плейсхолдер‑визуал: чистые формы/цвета (текстуры добавишь позже)
 * ✔ Адаптив, HiDPI, чистый Canvas, без внешних библиотек
 */

// ---------------------- Типы и константы ----------------------

type Vec2 = { x: number; y: number };

interface Player {
  pos: Vec2;
  vel: Vec2;
  speed: number; // базовая скорость (px/ms)
  dir: number; // угол к курсору (рад)
  hp: number; // 0..100
  hunger: number; // 0..100
  attackCooldown: number; // ms до готовности удара
  attackTimer: number; // таймер анимации удара (ms)
}

type ItemKind = "food" | "medkit";
interface Item {
  pos: Vec2;
  kind: ItemKind;
  taken?: boolean;
}

interface Enemy {
  pos: Vec2;
  vel: Vec2;
  hp: number;
  aggro: boolean;
  wanderT: number; // таймер смены направления
}

const WORLD_W = 2800;
const WORLD_H = 1800;
const PLAYER_RADIUS = 18;
const ENEMY_RADIUS = 16;
const ITEM_R = 10;

const MAX_HP = 100;
const MAX_HUNGER = 100;
const HUNGER_DRAIN_PER_SEC = 2.0; // скорость голода (ед/сек)
const STARVING_HP_DRAIN_PER_SEC = 6.0; // урон при голоде 0
const COLLISION_DMG_PER_SEC = 8.0; // урон от контакта с врагом

const ATTACK_COOLDOWN = 380; // ms
const ATTACK_RANGE = 85; // px
const ATTACK_ARC = Math.PI / 2.8; // сектор ~64°
const ATTACK_DMG = 34;
const ATTACK_KNOCK = 220; // импульс откидывания
const ATTACK_SWISH_TIME = 140; // длительность свиша (ms)

const ENEMY_SPEED = 0.12; // px/ms
const ENEMY_AGGRO_DIST = 420;

const CAMERA_LERP = 0.18; // плавность камеры

// ---------------------- Вспомогательные ----------------------

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Цвет бара: зелёный→красный по HSL (120→0)
function barColor01(t: number) {
  const hue = mix(0, 120, t); // 0=красн, 120=зелёный; инвертнём t ниже
  return `hsl(${hue}, 85%, 52%)`;
}

function dist(a: Vec2, b: Vec2) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function angle(a: Vec2, b: Vec2) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

// ---------------------- Главная страница ----------------------

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;

    // --- Размеры/ретина ---
    function resize() {
      const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const rect = cvs.getBoundingClientRect();
      const w = Math.max(800, Math.floor(rect.width));
      const h = Math.max(480, Math.floor(rect.height));
      cvs.width = Math.floor(w * DPR);
      cvs.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(cvs);
    resize();

    // --- Состояние мира ---
    const player: Player = {
      pos: { x: WORLD_W / 2, y: WORLD_H / 2 },
      vel: { x: 0, y: 0 },
      speed: 0.28, // px/ms
      dir: 0,
      hp: MAX_HP,
      hunger: MAX_HUNGER,
      attackCooldown: 0,
      attackTimer: 0,
    };

    const enemies: Enemy[] = [];
    for (let i = 0; i < 16; i++) {
      enemies.push({
        pos: { x: Math.random() * WORLD_W, y: Math.random() * WORLD_H },
        vel: { x: 0, y: 0 },
        hp: 100,
        aggro: false,
        wanderT: Math.random() * 2000,
      });
    }

    const items: Item[] = [];
    for (let i = 0; i < 18; i++) {
      const kind: ItemKind = Math.random() < 0.5 ? "food" : "medkit";
      items.push({ pos: { x: Math.random() * WORLD_W, y: Math.random() * WORLD_H }, kind });
    }

    const camera = { x: player.pos.x - 600, y: player.pos.y - 340 };

    // --- Ввод ---
    const keys = new Set<string>();
    const mouse = { x: 0, y: 0, worldX: 0, worldY: 0, down: false };

    function onKey(e: KeyboardEvent) {
      const k = e.key;
      const isDown = e.type === "keydown";
      const relevant = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D", "E", "e"];
      if (relevant.includes(k)) e.preventDefault();
      if (isDown) keys.add(k); else keys.delete(k);

      // Подбор предмета
      if (isDown && (k === "E" || k === "e")) pickupNearest();
    }

    function onPointerMove(e: PointerEvent) {
      const r = cvs.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    }
    function onPointerDown(e: PointerEvent) {
      if (e.button === 0) {
        mouse.down = true;
        tryAttack();
      }
    }
    function onPointerUp(e: PointerEvent) {
      if (e.button === 0) mouse.down = false;
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    // --- Игровой цикл ---
    let last = performance.now();
    let raf = 0;

    function tick() {
      const now = performance.now();
      let dt = Math.min(32, now - last);
      last = now;

      update(dt);
      draw();

      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    // --- Логика ---

    function update(dt: number) {
      // Обновим мировые координаты курсора
      mouse.worldX = camera.x + mouse.x;
      mouse.worldY = camera.y + mouse.y;

      // Движение игрока
      const up = keys.has("ArrowUp") || keys.has("w") || keys.has("W");
      const dn = keys.has("ArrowDown") || keys.has("s") || keys.has("S");
      const lf = keys.has("ArrowLeft") || keys.has("a") || keys.has("A");
      const rt = keys.has("ArrowRight") || keys.has("d") || keys.has("D");

      let ax = 0, ay = 0;
      if (up) ay -= 1;
      if (dn) ay += 1;
      if (lf) ax -= 1;
      if (rt) ax += 1;
      const len = Math.hypot(ax, ay) || 1;
      ax /= len; ay /= len;

      const spd = player.speed * dt;
      player.vel.x = ax * spd;
      player.vel.y = ay * spd;
      player.pos.x = clamp(player.pos.x + player.vel.x, PLAYER_RADIUS, WORLD_W - PLAYER_RADIUS);
      player.pos.y = clamp(player.pos.y + player.vel.y, PLAYER_RADIUS, WORLD_H - PLAYER_RADIUS);

      // Поворот к курсору
      player.dir = angle(player.pos, { x: mouse.worldX, y: mouse.worldY });

      // Таймеры атаки/кулдауна
      player.attackCooldown = Math.max(0, player.attackCooldown - dt);
      player.attackTimer = Math.max(0, player.attackTimer - dt);

      // Голод и урон от голода
      player.hunger = clamp(player.hunger - (HUNGER_DRAIN_PER_SEC * dt) / 1000, 0, MAX_HUNGER);
      if (player.hunger <= 0) {
        player.hp = clamp(player.hp - (STARVING_HP_DRAIN_PER_SEC * dt) / 1000, 0, MAX_HP);
      }

      // Враги: агрятся/бродят
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const d = dist(e.pos, player.pos);
        e.aggro = d < ENEMY_AGGRO_DIST;
        if (e.aggro) {
          const a = angle(e.pos, player.pos);
          e.vel.x = Math.cos(a) * ENEMY_SPEED * dt;
          e.vel.y = Math.sin(a) * ENEMY_SPEED * dt;
        } else {
          e.wanderT -= dt;
          if (e.wanderT <= 0) {
            e.wanderT = 800 + Math.random() * 1400;
            const a = Math.random() * Math.PI * 2;
            e.vel.x = Math.cos(a) * ENEMY_SPEED * 0.5 * dt;
            e.vel.y = Math.sin(a) * ENEMY_SPEED * 0.5 * dt;
          }
        }
        e.pos.x = clamp(e.pos.x + e.vel.x, ENEMY_RADIUS, WORLD_W - ENEMY_RADIUS);
        e.pos.y = clamp(e.pos.y + e.vel.y, ENEMY_RADIUS, WORLD_H - ENEMY_RADIUS);

        // Контактный урон
        const col = Math.hypot(e.pos.x - player.pos.x, e.pos.y - player.pos.y) < PLAYER_RADIUS + ENEMY_RADIUS;
        if (col && e.hp > 0) {
          player.hp = clamp(player.hp - (COLLISION_DMG_PER_SEC * dt) / 1000, 0, MAX_HP);
        }
      }

      // Камера к игроку (плавно)
      const cvsW = cvs.getBoundingClientRect().width;
      const cvsH = cvs.getBoundingClientRect().height;
      const targetX = clamp(player.pos.x - cvsW / 2, 0, WORLD_W - cvsW);
      const targetY = clamp(player.pos.y - cvsH / 2, 0, WORLD_H - cvsH);
      camera.x = mix(camera.x, targetX, CAMERA_LERP);
      camera.y = mix(camera.y, targetY, CAMERA_LERP);

      // Смерть — мягко ничего не делаем (можно добавить рестарт)
    }

    function tryAttack() {
      if (player.attackCooldown > 0) return;
      player.attackCooldown = ATTACK_COOLDOWN;
      player.attackTimer = ATTACK_SWISH_TIME;

      const a0 = player.dir;
      const left = a0 - ATTACK_ARC / 2;
      const right = a0 + ATTACK_ARC / 2;

      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const d = dist(player.pos, e.pos);
        if (d > ATTACK_RANGE + ENEMY_RADIUS) continue;
        const ang = angle(player.pos, e.pos);
        // нормализуем разницу углов в [-PI, PI]
        let diff = Math.atan2(Math.sin(ang - a0), Math.cos(ang - a0));
        if (Math.abs(diff) <= ATTACK_ARC / 2) {
          // попали
          e.hp -= ATTACK_DMG;
          // откидывание
          e.vel.x += Math.cos(a0) * (ATTACK_KNOCK / Math.max(20, d));
          e.vel.y += Math.sin(a0) * (ATTACK_KNOCK / Math.max(20, d));
        }
      }
    }

    function pickupNearest() {
      let best: Item | null = null;
      let bestD = 9999;
      for (const it of items) {
        if (it.taken) continue;
        const d = dist(player.pos, it.pos);
        if (d < 48 && d < bestD) { best = it; bestD = d; }
      }
      if (!best) return;
      best.taken = true;
      if (best.kind === "food") {
        player.hunger = clamp(player.hunger + 25, 0, MAX_HUNGER);
      } else {
        player.hp = clamp(player.hp + 28, 0, MAX_HP);
      }
    }

    // --- Рендер ---

    function draw() {
      const rect = cvs.getBoundingClientRect();
      const W = rect.width; const H = rect.height;

      // Фон и сетка
      ctx.fillStyle = "#0a0e13";
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(-camera.x, -camera.y);

      // Сетка мира
      ctx.strokeStyle = "#101820";
      ctx.lineWidth = 1;
      for (let x = 0; x <= WORLD_W; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke();
      }
      for (let y = 0; y <= WORLD_H; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke();
      }

      // Предметы
      for (const it of items) {
        if (it.taken) continue;
        if (it.kind === "food") {
          // круг — еда (оранжевый)
          ctx.fillStyle = "#ff9f43";
          ctx.beginPath(); ctx.arc(it.pos.x, it.pos.y, ITEM_R, 0, Math.PI * 2); ctx.fill();
        } else {
          // квадрат — аптечка (лайм)
          ctx.fillStyle = "#8cff6b";
          roundRect(ctx, it.pos.x - ITEM_R, it.pos.y - ITEM_R, ITEM_R * 2, ITEM_R * 2, 4);
          ctx.fill();
          // крест
          ctx.fillStyle = "#0a0e13";
          ctx.fillRect(it.pos.x - 2, it.pos.y - ITEM_R + 4, 4, ITEM_R * 2 - 8);
          ctx.fillRect(it.pos.x - ITEM_R + 4, it.pos.y - 2, ITEM_R * 2 - 8, 4);
        }
      }

      // Враги
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        ctx.save();
        ctx.translate(e.pos.x, e.pos.y);
        ctx.fillStyle = "#ff4d57";
        drawTriangle(ctx, 0, 0, ENEMY_RADIUS * 1.5, (Math.atan2(e.vel.y, e.vel.x) || 0) + Math.PI / 2);
        ctx.fill();
        // hp полоса над врагом
        const w = 28, h = 5;
        const hp01 = clamp(e.hp / 100, 0, 1);
        ctx.fillStyle = "#1a222a"; ctx.fillRect(-w / 2, -ENEMY_RADIUS - 16, w, h);
        ctx.fillStyle = barColor01(hp01 * 120 / 120); // зел→крас
        ctx.fillRect(-w / 2, -ENEMY_RADIUS - 16, w * hp01, h);
        ctx.restore();
      }

      // Игрок (стрелка‑ромб)
      ctx.save();
      ctx.translate(player.pos.x, player.pos.y);
      ctx.rotate(player.dir + Math.PI / 2);
      // тень/свечение
      ctx.shadowColor = "#45f3ff"; ctx.shadowBlur = 14;
      ctx.fillStyle = "#1fd2ff";
      drawKite(ctx, 0, 0, PLAYER_RADIUS);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Сектор удара (если идёт анимация)
      if (player.attackTimer > 0) {
        const t = 1 - player.attackTimer / ATTACK_SWISH_TIME; // 0..1
        const alpha = 0.45 * Math.sin(t * Math.PI);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#a9f8ff";
        drawArcSector(ctx, player.pos.x, player.pos.y, PLAYER_RADIUS, ATTACK_RANGE, player.dir - ATTACK_ARC / 2, player.dir + ATTACK_ARC / 2);
        ctx.fill();
        ctx.restore();
      }

      // Границы мира
      ctx.strokeStyle = "#1b2a33"; ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, WORLD_W, WORLD_H);

      ctx.restore();

      // HUD слева сверху: HP + Голод
      drawBars(W, H);

      // Миникарта справа сверху
      drawMinimap(W, H);

      // Подсказки
      ctx.fillStyle = "#bdefff";
      ctx.font = "600 12px ui-sans-serif, system-ui, -apple-system";
      ctx.fillText("Стрелки/WASD — движение  |  ЛКМ — удар  |  E — подобрать", 12, H - 16);
    }

    function drawBars(W: number, H: number) {
      const pad = 12;
      const w = Math.min(260, W * 0.35);
      const h = 16;

      // HP
      const hp01 = clamp(player.hp / MAX_HP, 0, 1);
      const hpCol = barColor01(hp01 * 120 / 120);
      roundedBar(12, 12, w, h, hp01, hpCol, "HP");

      // Голод
      const hg01 = clamp(player.hunger / MAX_HUNGER, 0, 1);
      const hgCol = barColor01(hg01 * 120 / 120);
      roundedBar(12, 12 + h + 8, w * 0.85, h, hg01, hgCol, "HUNGER");

      function roundedBar(x: number, y: number, w: number, h: number, v01: number, color: string, label: string) {
        // фон
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        roundRect(ctx, x, y, w, h, 8); ctx.fill();
        // значение
        ctx.fillStyle = color;
        roundRect(ctx, x, y, Math.max(6, w * v01), h, 8); ctx.fill();
        // текст
        ctx.fillStyle = "#e2fbff"; ctx.font = "700 11px ui-sans-serif, system-ui";
        ctx.fillText(label, x + 8, y - 2);
      }
    }

    function drawMinimap(W: number, H: number) {
      const mw = 180, mh = 120;
      const x = W - mw - 12;
      const y = 12;
      ctx.save();
      // фон
      ctx.fillStyle = "rgba(255,255,255,0.04)"; roundRect(ctx, x, y, mw, mh, 10); ctx.fill();
      ctx.strokeStyle = "rgba(173,236,255,0.35)"; ctx.lineWidth = 2; roundRect(ctx, x, y, mw, mh, 10); ctx.stroke();
      // содержимое
      const sx = mw / WORLD_W, sy = mh / WORLD_H;
      // игрок
      ctx.fillStyle = "#1fd2ff";
      ctx.beginPath(); ctx.arc(x + player.pos.x * sx, y + player.pos.y * sy, 3, 0, Math.PI * 2); ctx.fill();
      // враги
      ctx.fillStyle = "#ff4d57";
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        ctx.fillRect(x + e.pos.x * sx - 2, y + e.pos.y * sy - 2, 4, 4);
      }
      // предметы
      for (const it of items) {
        if (it.taken) continue;
        ctx.fillStyle = it.kind === "food" ? "#ff9f43" : "#8cff6b";
        ctx.fillRect(x + it.pos.x * sx - 1.5, y + it.pos.y * sy - 1.5, 3, 3);
      }
      ctx.restore();
    }

    // --- Рисовалки примитивов ---

    function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(-r * 0.75, r);
      ctx.lineTo(r * 0.75, r);
      ctx.closePath();
      ctx.restore();
    }

    function drawKite(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x - r * 0.7, y);
      ctx.lineTo(x, y + r * 1.2);
      ctx.lineTo(x + r * 0.7, y);
      ctx.closePath();
    }

    function drawArcSector(ctx: CanvasRenderingContext2D, cx: number, cy: number, innerR: number, outerR: number, a0: number, a1: number) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, a0, a1);
      ctx.arc(cx, cy, innerR, a1, a0, true);
      ctx.closePath();
    }

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  return (
    <div className="min-h-[60vh] w-full" style={{ display: "grid", placeItems: "center", background: "#06090d" }}>
      <div style={{ width: "min(100%, 1100px)", aspectRatio: "16/9", position: "relative" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", borderRadius: 16, boxShadow: "0 18px 60px rgba(0,0,0,.45), inset 0 0 0 1px rgba(120,220,255,.15)" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 16, boxShadow: "inset 0 0 100px rgba(31,210,255,.06)" }} />
      </div>
    </div>
  );
}
