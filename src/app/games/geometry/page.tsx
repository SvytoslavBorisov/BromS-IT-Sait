"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Next.js Geometry‑Dash‑style Runner — /dash
 * 
 * Полностью автономный компонент (без внешних зависимостей):
 *  • Canvas‑рендер, параллакс‑звёзды, неоновая «земля», частицы
 *  • Авто‑скорость с нарастанием, вращающийся куб, монеты
 *  • Треугольные «шипы» и прямоугольные блоки
 *  • Коллизии, пауза (P), рестарт (R), мобильный тап‑контроль
 *  • Сохранение рекорда в localStorage
 *  • Адаптив под любые размеры, Retina‑скейлинг
 *
 * Установка: положите файл как src/app/dash/page.tsx и откройте /dash
 */

// ---------- Вспомогательные типы ----------

type Vec2 = { x: number; y: number };

interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  onGround: boolean;
  rotation: number; // для эффекта вращения в воздухе
  color: string;
}

interface ObstacleBase {
  kind: "rect" | "spike";
  x: number; // левый край в мировых координатах
  w: number; // ширина
  passed?: boolean; // для счета очков
}

interface RectObstacle extends ObstacleBase {
  kind: "rect";
  h: number; // высота прямоугольника
}

interface SpikeObstacle extends ObstacleBase {
  kind: "spike";
  h: number; // высота треугольника (апекс вверх)
}

interface Coin {
  x: number;
  y: number;
  r: number;
  taken?: boolean;
  phase: number; // для анимации пульсации
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1..0
  hue: number;
}

// ---------- Константы физики / оформления ----------

const BASE_HEIGHT = 900; // Реф. высота для нормализации
const G = 0.0022 * BASE_HEIGHT; // гравитация
const JUMP_V = -0.045 * BASE_HEIGHT; // импульс прыжка
const MAX_FALL = 0.06 * BASE_HEIGHT; // терминальная скорость
const PLAYER_SIZE = 0.045 * BASE_HEIGHT;
const GROUND_RATIO = 0.78; // позиция поверхности земли: H * 0.78
const GROUND_HEIGHT = 0.02 * BASE_HEIGHT; // толщина полосы земли (декор)
const SPAWN_MIN = 700; // мин. расстояние между препятствиями (в px мировых)
const SPAWN_MAX = 1200; // макс. расстояние между препятствиями
const COIN_CHANCE = 0.6; // вероятность спавна монеты рядом с препятствием
const STAR_COUNT = 120; // звезды параллакса

// ---------- Утилиты ----------

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function nowMs() {
  return performance.now();
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Проверка «точка в равнобедренном треугольнике апексом вверх»
// Треугольник: основание [x, x+w] на уровне baseY, вершина (x+w/2, baseY - h)
function pointInUpTriangle(px: number, py: number, x: number, w: number, baseY: number, h: number) {
  if (px < x || px > x + w || py < baseY - h || py > baseY) return false;
  const cx = x + w / 2;
  const dx = Math.abs(px - cx);
  const maxDy = (h * (w / 2 - dx)) / (w / 2);
  const triY = baseY - maxDy;
  return py >= triY; // ниже линии треугольника — столкновение
}

// AABB пересечение
function aabb(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ---------- Главный компонент ----------

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dead, setDead] = useState(false);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [high, setHigh] = useState(0);

  // Для сигналов UI
  const [uiBlink, setUiBlink] = useState(0);

  // Игровые рефы, чтобы не триггерить ререндеры
  const playerRef = useRef<Player | null>(null);
  const worldXRef = useRef(0); // мировая прокрутка
  const speedRef = useRef(0.34 * BASE_HEIGHT / 1000); // px/ms, начальная скорость
  const baseSpeedRef = useRef(0.34 * BASE_HEIGHT / 1000);
  const lastMsRef = useRef(0);
  const groundYRef = useRef(0);
  const obstaclesRef = useRef<(RectObstacle | SpikeObstacle)[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextSpawnAtRef = useRef(900); // мировой x, где появится след. преп.
  const isPressedRef = useRef(false); // удержание кнопки (для мобилок)

  const starsRef = useRef<{ x: number; y: number; z: number }[]>([]);
  const rafRef = useRef<number | null>(null);

  // ---------- Инициализация ----------

  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;

    // Retina‑скейл + ресайз
    function resize() {
      const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const rect = cvs.getBoundingClientRect();
      const w = Math.max(640, Math.floor(rect.width));
      const h = Math.max(420, Math.floor(rect.height));
      cvs.width = Math.floor(w * DPR);
      cvs.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      groundYRef.current = h * GROUND_RATIO;
      // нормализация базовых констант под h
      baseSpeedRef.current = 0.34 * h / 1000;
      if (!started) speedRef.current = baseSpeedRef.current;
    }

    const ro = new ResizeObserver(resize);
    ro.observe(cvs);
    resize();

    // Звезды параллакса
    if (starsRef.current.length === 0) {
      const rect = cvs.getBoundingClientRect();
      for (let i = 0; i < STAR_COUNT; i++) {
        starsRef.current.push({ x: Math.random() * rect.width, y: Math.random() * rect.height, z: rand(0.2, 1.2) });
      }
    }

    // Игрок
    resetGame();

    // Контролы
    function onDown(e: Event) {
      e.preventDefault();
      isPressedRef.current = true;
      tryJump();
    }
    function onUp() {
      isPressedRef.current = false;
    }

    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        if (e.type === "keydown") {
          e.preventDefault();
          isPressedRef.current = true;
          tryJump();
        } else if (e.type === "keyup") {
          isPressedRef.current = false;
        }
      }
      if (e.type === "keydown") {
        if (e.code === "KeyP") {
          togglePause();
        } else if (e.code === "KeyR") {
          restart();
        }
      }
    }

    window.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    // Цикл
    lastMsRef.current = nowMs();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    // ---------- Локальные функции ----------

    function resetGame() {
      const rect = cvs.getBoundingClientRect();
      const h = rect.height;
      const size = Math.max(28, (PLAYER_SIZE / BASE_HEIGHT) * h);
      playerRef.current = {
        x: rect.width * 0.18,
        y: groundYRef.current - size,
        w: size,
        h: size,
        vy: 0,
        onGround: true,
        rotation: 0,
        color: "#5af7ff",
      };
      worldXRef.current = 0;
      obstaclesRef.current = [];
      coinsRef.current = [];
      particlesRef.current = [];
      nextSpawnAtRef.current = rect.width * 1.0; // немного пустоты в начале
      setScore(0);
      setCoins(0);
      setDead(false);
    }

    function togglePause() {
      if (!started) return;
      setPaused((p) => !p);
    }

    function restart() {
      setStarted(true);
      setPaused(false);
      resetGame();
      speedRef.current = baseSpeedRef.current;
      setUiBlink(1);
    }

    function tryJump() {
      if (!started) {
        setStarted(true);
        setPaused(false);
        resetGame();
        setUiBlink(1);
        return;
      }
      if (paused || dead) return;
      const p = playerRef.current!;
      if (p.onGround) {
        p.vy = (JUMP_V / BASE_HEIGHT) * cvs.getBoundingClientRect().height;
        p.onGround = false;
        spawnDust(p.x + p.w * 0.2, p.y + p.h, 8, 130);
      }
    }

    function spawnDust(x: number, y: number, n: number, hue = 180) {
      const rect = cvs.getBoundingClientRect();
      for (let i = 0; i < n; i++) {
        particlesRef.current.push({
          x,
          y,
          vx: rand(-0.6, 0.6) * rect.height / 600,
          vy: rand(-1.2, -0.4) * rect.height / 600,
          life: 1,
          hue: hue + rand(-20, 20),
        });
      }
    }

    function spawnExplosion(x: number, y: number) {
      const rect = cvs.getBoundingClientRect();
      for (let i = 0; i < 42; i++) {
        const ang = rand(0, Math.PI * 2);
        const spd = rand(0.4, 1.8) * rect.height / 600;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1,
          hue: rand(330, 360),
        });
      }
    }

    function spawnSet(atWorldX: number) {
      const rect = cvs.getBoundingClientRect();
      const H = rect.height;
      const gY = groundYRef.current;

      // Случайный выбор преп.
      const isSpike = Math.random() < 0.55;
      if (isSpike) {
        const w = rand(50, 90) * (H / BASE_HEIGHT);
        const h = rand(60, 140) * (H / BASE_HEIGHT);
        obstaclesRef.current.push({ kind: "spike", x: atWorldX, w, h });
        // монета
        if (Math.random() < COIN_CHANCE) {
          coinsRef.current.push({ x: atWorldX + w * 0.5, y: gY - h - rand(40, 80) * (H / BASE_HEIGHT), r: Math.max(9, 13 * (H / BASE_HEIGHT)), phase: Math.random() * Math.PI * 2 });
        }
      } else {
        const w = rand(60, 130) * (H / BASE_HEIGHT);
        const h = rand(40, 120) * (H / BASE_HEIGHT);
        obstaclesRef.current.push({ kind: "rect", x: atWorldX, w, h });
        if (Math.random() < COIN_CHANCE) {
          coinsRef.current.push({ x: atWorldX + w * 0.5, y: gY - h - rand(30, 60) * (H / BASE_HEIGHT), r: Math.max(9, 13 * (H / BASE_HEIGHT)), phase: Math.random() * Math.PI * 2 });
        }
      }

      // Вероятность двойного преп. (комбо)
      if (Math.random() < 0.35) {
        const gap = rand(120, 220) * (H / BASE_HEIGHT);
        spawnSet(atWorldX + gap);
      }
    }

    function ensureSpawn(worldX: number) {
      const rect = cvs.getBoundingClientRect();
      const until = worldX + rect.width * 1.2;
      while (nextSpawnAtRef.current < until) {
        spawnSet(nextSpawnAtRef.current);
        nextSpawnAtRef.current += rand(SPAWN_MIN, SPAWN_MAX) * (rect.height / BASE_HEIGHT);
      }
    }

    function tick() {
      const t = nowMs();
      let dt = t - lastMsRef.current;
      lastMsRef.current = t;

      if (!started || paused) {
        draw(dt, true);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      // Без рывков — ограничим dt
      dt = clamp(dt, 0, 32);

      update(dt);
      draw(dt, false);
      rafRef.current = requestAnimationFrame(tick);
    }

    function update(dt: number) {
      const rect = cvs.getBoundingClientRect();
      const H = rect.height;
      const p = playerRef.current!;

      // Ускорение скорости по чуть‑чуть
      speedRef.current += (0.0000022 * H) * (dt / 16.67) / 1000;

      const speed = speedRef.current * dt; // сдвиг мира
      worldXRef.current += speed;

      // Спавн
      ensureSpawn(worldXRef.current);

      // Физика игрока
      p.vy += (G * (H / BASE_HEIGHT)) * (dt / 16.67);
      p.vy = clamp(p.vy, -Infinity, (MAX_FALL * (H / BASE_HEIGHT)));
      p.y += p.vy * (dt / 16.67);
      // Земля
      const gY = groundYRef.current - p.h;
      if (p.y >= gY) {
        if (!p.onGround) spawnDust(p.x + p.w * 0.2, groundYRef.current, 14, 180);
        p.y = gY;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.onGround = false;
      }

      // Вращение, только в воздухе
      if (!p.onGround) p.rotation += 0.015 * dt;
      else p.rotation *= 0.7;

      // Сдвиг препятствий/монет (мировой сдвиг — просто проверяем видимость по экрану)
      const leftX = worldXRef.current - rect.width * 0.2;
      const rightX = worldXRef.current + rect.width * 1.2;

      // Коллизии
      let died = false;
      const viewX = (x: number) => x - worldXRef.current + rect.width * 0.22; // преобразование мировых X в экранные (с привязкой игрока)

      obstaclesRef.current = obstaclesRef.current.filter((o) => o.x + o.w > leftX - 200 && o.x < rightX + 200);

      for (const o of obstaclesRef.current) {
        // экранные координаты препятствий
        const ox = viewX(o.x);
        const oy = groundYRef.current;
        const px = p.x;
        const py = p.y;

        if (o.kind === "rect") {
          const ro = o as RectObstacle;
          if (aabb(px, py, p.w, p.h, ox, oy - ro.h, ro.w, ro.h)) {
            died = true;
            break;
          }
        } else {
          const so = o as SpikeObstacle;
          // ББ для раннего выхода
          if (aabb(px, py, p.w, p.h, ox, oy - so.h, so.w, so.h)) {
            // Проверим четыре угла игрока
            const corners: Vec2[] = [
              { x: px, y: py + p.h },
              { x: px + p.w, y: py + p.h },
              { x: px, y: py },
              { x: px + p.w, y: py },
            ];
            for (const c of corners) {
              if (pointInUpTriangle(c.x, c.y, ox, so.w, oy, so.h)) {
                died = true;
                break;
              }
            }
            if (died) break;
          }
        }
        // очки за пройденные преп.
        if (!o.passed && viewX(o.x + o.w) < p.x) {
          o.passed = true;
          setScore((s) => s + 1);
        }
      }

      // Монеты
      for (const c of coinsRef.current) {
        c.phase += 0.02 * dt;
      }
      coinsRef.current = coinsRef.current.filter((c) => c.x > leftX - 100 && c.x < rightX + 100 && !c.taken);
      for (const c of coinsRef.current) {
        const cx = viewX(c.x);
        const cy = c.y;
        if (aabb(p.x, p.y, p.w, p.h, cx - c.r, cy - c.r, 2 * c.r, 2 * c.r)) {
          c.taken = true;
          setCoins((k) => k + 1);
          spawnDust(cx, cy, 12, 50);
        }
      }

      // Частицы
      particlesRef.current = particlesRef.current.filter((pt) => (pt.life -= 0.012 * (dt / 16.67)) > 0);
      for (const pt of particlesRef.current) {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 0.0005 * H * (dt / 16.67);
      }

      if (died) {
        setDead(true);
        setPaused(false);
        setStarted(true);
        // рекорд
        setHigh((h) => {
          const nxt = Math.max(h, score);
          try { localStorage.setItem("dash_highscore", String(nxt)); } catch {}
          return nxt;
        });
        spawnExplosion(p.x + p.w / 2, p.y + p.h / 2);
      }

      // Автопрыжок при удержании и касании земли (как в GD при зажатии)
      if (isPressedRef.current && p.onGround) {
        tryJump();
      }
    }

    function draw(dt: number, frozen: boolean) {
      const rect = cvs.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const ctx = cvs.getContext("2d")!;

      // Фон — вертикальный градиент неона
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#090915");
      grad.addColorStop(0.5, "#0b0b1c");
      grad.addColorStop(1, "#0d0d22");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Параллакс звезды
      const speed = speedRef.current * (frozen ? 0 : dt);
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "white";
      for (const s of starsRef.current) {
        const sx = ((s.x - (worldXRef.current * 0.1) / s.z) % W + W) % W;
        const sy = s.y;
        const size = clamp(1.2 / s.z, 0.6, 2.2);
        ctx.fillRect(sx, sy, size, size);
      }
      ctx.restore();

      // Пол — неон: светящаяся линия + сетка
      const gY = groundYRef.current;
      drawNeonGround(ctx, W, H, gY);

      // Препятствия и монеты
      const p = playerRef.current!;
      const viewX = (x: number) => x - worldXRef.current + W * 0.22;

      // Монеты (под слоем игрока, чтобы выглядело глубже)
      for (const c of coinsRef.current) {
        const cx = viewX(c.x);
        const pul = (Math.sin(c.phase) * 0.3 + 0.7);
        drawCoin(ctx, cx, c.y, c.r * pul);
      }

      // Препятствия
      for (const o of obstaclesRef.current) {
        const ox = viewX(o.x);
        if (o.kind === "rect") drawRectObstacle(ctx, ox, gY, o.w, (o as RectObstacle).h);
        else drawSpikeObstacle(ctx, ox, gY, o.w, (o as SpikeObstacle).h);
      }

      // Игрок
      drawPlayer(ctx, p);

      // Частицы — сверху
      for (const pt of particlesRef.current) drawParticle(ctx, pt);

      // HUD
      drawHUD(ctx, W, H);

      // Оверлеи: старт / пауза / смерть
      drawOverlays(ctx, W, H);

      // UI blink при рестарте
      if (uiBlink > 0) {
        const t = easeOutCubic(uiBlink);
        ctx.fillStyle = `rgba(90,247,255,${t * 0.15})`;
        ctx.fillRect(0, 0, W, H);
        setUiBlink(Math.max(0, uiBlink - 0.04 * (dt / 16.67)));
      }
    }

    function drawNeonGround(ctx: CanvasRenderingContext2D, W: number, H: number, gY: number) {
      // Светящаяся линия земли
      ctx.save();
      ctx.shadowColor = "#34f1ff";
      ctx.shadowBlur = 24;
      ctx.strokeStyle = "#34f1ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, gY + 0.5);
      ctx.lineTo(W, gY + 0.5);
      ctx.stroke();
      ctx.restore();

      // Тонкая сетка «неонового пола» ниже
      const gridTop = gY + 2;
      const gridBottom = Math.min(H, gY + (GROUND_HEIGHT / BASE_HEIGHT) * H + 160);
      ctx.save();
      ctx.strokeStyle = "rgba(50, 220, 255, 0.12)";
      ctx.lineWidth = 1;
      const vStep = 36;
      for (let x = 0; x < W; x += vStep) {
        ctx.beginPath();
        ctx.moveTo(x + ((worldXRef.current * 0.5) % vStep), gridTop);
        ctx.lineTo(x, gridBottom);
        ctx.stroke();
      }
      const hStep = 20;
      for (let y = gridTop; y < gridBottom; y += hStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawRectObstacle(ctx: CanvasRenderingContext2D, x: number, baseY: number, w: number, h: number) {
      const y = baseY - h;
      const r = 8;
      // корпус
      ctx.save();
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, "#132f3a");
      grad.addColorStop(1, "#0d1d24");
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, w, h, r);
      ctx.fill();
      // кайма
      ctx.strokeStyle = "#34f1ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      // блик
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#5af7ff";
      roundRect(ctx, x + 4, y + 4, w - 8, 10, 6);
      ctx.fill();
      ctx.restore();
    }

    function drawSpikeObstacle(ctx: CanvasRenderingContext2D, x: number, baseY: number, w: number, h: number) {
      const cx = x + w / 2;
      ctx.save();
      // тень/свечение
      ctx.shadowColor = "#2ee7ff";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#0c2530";
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + w, baseY);
      ctx.lineTo(cx, baseY - h);
      ctx.closePath();
      ctx.fill();
      // контур
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#2ee7ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      // внутренний блик
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(x + 6, baseY - 4);
      ctx.lineTo(cx, baseY - h + 8);
      ctx.lineTo(x + w - 6, baseY - 4);
      ctx.closePath();
      ctx.fillStyle = "#34f1ff";
      ctx.fill();
      ctx.restore();
    }

    function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
      ctx.save();
      ctx.shadowColor = "#ffd54a";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#ffcc33";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffeaa0";
      ctx.lineWidth = 2;
      ctx.stroke();
      // глянец
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.55, Math.PI * 1.1, Math.PI * 1.8);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    function drawPlayer(ctx: CanvasRenderingContext2D, p: Player) {
      ctx.save();
      // свечение
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 18;

      // вращающийся куб
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rotation);
      ctx.translate(-p.w / 2, -p.h / 2);

      // корпус
      const grad = ctx.createLinearGradient(0, 0, 0, p.h);
      grad.addColorStop(0, "#0d3940");
      grad.addColorStop(1, "#0b2930");
      ctx.fillStyle = grad;
      roundRect(ctx, 0, 0, p.w, p.h, 8);
      ctx.fill();

      // кайма
      ctx.shadowBlur = 0;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      roundRect(ctx, 0, 0, p.w, p.h, 8);
      ctx.stroke();

      // «глаза»
      ctx.fillStyle = "#5af7ff";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(p.w * 0.33, p.h * 0.42, p.w * 0.09, 0, Math.PI * 2);
      ctx.arc(p.w * 0.67, p.h * 0.42, p.w * 0.09, 0, Math.PI * 2);
      ctx.fill();

      // рот
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.roundRect(p.w * 0.25, p.h * 0.62, p.w * 0.5, p.h * 0.16, 6);
      ctx.fillStyle = "#34f1ff";
      ctx.fill();
      ctx.restore();
    }

    function drawParticle(ctx: CanvasRenderingContext2D, pt: Particle) {
      ctx.save();
      ctx.globalAlpha = clamp(pt.life, 0, 1);
      ctx.fillStyle = `hsl(${pt.hue}, 90%, 60%)`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2 + 3 * (1 - pt.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawHUD(ctx: CanvasRenderingContext2D, W: number, H: number) {
      // Рекорд из localStorage
      if (!high) {
        try {
          const v = Number(localStorage.getItem("dash_highscore") || 0);
          if (!isNaN(v) && v > 0) setHigh(v);
        } catch {}
      }

      ctx.save();
      ctx.font = "600 16px ui-sans-serif, system-ui, -apple-system, Segoe UI";
      ctx.fillStyle = "#c8f7ff";
      ctx.shadowColor = "#34f1ff";
      ctx.shadowBlur = 10;
      ctx.textAlign = "left";
      const pad = 16;
      ctx.fillText(`SCORE: ${score}`, pad, 28);
      ctx.fillText(`COINS: ${coins}`, pad, 50);
      ctx.textAlign = "right";
      ctx.fillText(`BEST: ${Math.max(high, score)}`, W - pad, 28);

      // Прогресс‑бар скорости ("сложность")
      const s = clamp(speedRef.current / (baseSpeedRef.current * 2.5), 0, 1);
      const barW = Math.min(280, W * 0.4);
      const x = (W - barW) / 2;
      const y = 20;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(ctx, x, y, barW, 10, 6);
      ctx.fill();
      const grad = ctx.createLinearGradient(x, y, x + barW, y);
      grad.addColorStop(0, "#32ffd2");
      grad.addColorStop(1, "#34f1ff");
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, barW * s, 10, 6);
      ctx.fill();
      ctx.restore();
    }

    function drawOverlays(ctx: CanvasRenderingContext2D, W: number, H: number) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, W, H);

      // Подписи
      ctx.shadowColor = "#34f1ff";
      ctx.shadowBlur = 22;
      ctx.fillStyle = "#d9fbff";

      if (!started) {
        drawTitle(ctx, W, H, "NEON DASH");
        drawSub(ctx, W, H, "Space / ↑ / Click / Tap — Прыжок  |  P — Пауза  |  R — Рестарт");
        drawButton(ctx, W, H, "НАЧАТЬ", 0.62, () => {
          setStarted(true);
          setPaused(false);
          resetGame();
          setUiBlink(1);
        });
      } else if (paused && !dead) {
        drawTitle(ctx, W, H, "ПАУЗА");
        drawSub(ctx, W, H, "Нажми P чтобы продолжить");
      } else if (dead) {
        drawTitle(ctx, W, H, "ПОРАЖЕНИЕ");
        drawSub(ctx, W, H, "R — рестарт  |  Esc — меню");
        drawButton(ctx, W, H, "ЕЩЁ РАЗ", 0.62, () => {
          setDead(false);
          restart();
        });
      }
      ctx.restore();
    }

    function drawTitle(ctx: CanvasRenderingContext2D, W: number, H: number, text: string) {
      ctx.save();
      ctx.font = "900 64px ui-sans-serif, system-ui, -apple-system, Segoe UI";
      ctx.fillText(text, W / 2, H * 0.36);
      ctx.restore();
    }

    function drawSub(ctx: CanvasRenderingContext2D, W: number, H: number, text: string) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.font = "600 18px ui-sans-serif, system-ui, -apple-system, Segoe UI";
      ctx.fillText(text, W / 2, H * 0.43);
      ctx.restore();
    }

    function drawButton(
      ctx: CanvasRenderingContext2D,
      W: number,
      H: number,
      label: string,
      yRatio: number,
      onClick: () => void
    ) {
      const bw = 240;
      const bh = 56;
      const x = W / 2 - bw / 2;
      const y = H * yRatio - bh / 2;

      // фон
      const grd = ctx.createLinearGradient(x, y, x + bw, y + bh);
      grd.addColorStop(0, "#32ffd2");
      grd.addColorStop(1, "#34f1ff");
      ctx.fillStyle = grd;
      roundRect(ctx, x, y, bw, bh, 12);
      ctx.fill();

      // текст
      ctx.save();
      ctx.fillStyle = "#071319";
      ctx.font = "800 20px ui-sans-serif, system-ui, -apple-system, Segoe UI";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + bw / 2, y + bh / 2);
      ctx.restore();

      // hit‑box: регистрируем клики
      // (Кликаем по всему канвасу и проверяем попадание)
      // Простой разовый обработчик: слушаем только пока кнопка видна
      const listener = (ev: MouseEvent | PointerEvent) => {
        const r = canvasRef.current!.getBoundingClientRect();
        const px = (ev as PointerEvent).clientX - r.left;
        const py = (ev as PointerEvent).clientY - r.top;
        if (px >= x && px <= x + bw && py >= y && py <= y + bh) {
          onClick();
          window.removeEventListener("pointerdown", listener);
        }
      };
      window.addEventListener("pointerdown", listener);
    }

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
  }, [started, paused, dead, score, coins, high, uiBlink]);

  // ---------- Разметка ----------
  return (
    <div className="min-h-[60vh] w-full" style={{ display: "grid", placeItems: "center", background: "#05050b" }}>
      <div style={{ width: "min(100%, 1100px)", aspectRatio: "16/9", position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block", borderRadius: 18, boxShadow: "0 20px 80px rgba(52,241,255,.12), inset 0 0 0 1px rgba(52,241,255,.15)" }}
        />
        {/* Верхняя панель управления — чисто декоративная */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", borderRadius: 18, boxShadow: "inset 0 0 80px rgba(52,241,255,.06)" }} />
        <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", justifyContent: "space-between", gap: 8, pointerEvents: "none" }}>
          <Badge text="NEON DASH" />
          <Badge text="/dash" />
        </div>
      </div>
      <FooterNote />
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <div style={{
      padding: "6px 10px",
      borderRadius: 999,
      background: "linear-gradient(90deg,#12242b,#0d1b21)",
      color: "#b9f6ff",
      fontSize: 12,
      letterSpacing: 0.6,
      fontWeight: 700,
      textTransform: "uppercase",
      boxShadow: "0 0 0 1px rgba(52,241,255,.18), 0 0 20px rgba(52,241,255,.05)",
    }}>{text}</div>
  );
}

function FooterNote() {
  return (
    <div style={{ color: "#7defff", opacity: .8, fontSize: 12, marginTop: 10 }}>
      Space/↑/ЛКМ/тап — прыжок · P — пауза · R — рестарт
    </div>
  );
}
