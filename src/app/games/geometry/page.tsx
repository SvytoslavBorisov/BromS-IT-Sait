"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Next.js Geometry-Dash-style Runner — /dash
 *
 * Исправления:
 *  • Коллизии со шпилями: «мягкая» проверка rect↔triangle без убийства по базовой линии, небольшой margin
 *  • Единый якорь проекции viewX: считаем относительно X игрока (визуал = физика)
 *  • Главный useEffect монтируется один раз; актуальные стейты читаем через .current
 *  • Кнопки-оверлея больше не множат слушатели (once: true)
 *  • Хитбокс игрока слегка ужат (прощает касания пиксель-в-пиксель)
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
  rotation: number;
  color: string;
}

interface ObstacleBase {
  kind: "rect" | "spike";
  x: number;
  w: number;
  passed?: boolean;
}

interface RectObstacle extends ObstacleBase {
  kind: "rect";
  h: number;
}

interface SpikeObstacle extends ObstacleBase {
  kind: "spike";
  h: number;
}

interface Coin {
  x: number;
  y: number;
  r: number;
  taken?: boolean;
  phase: number;
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

const BASE_HEIGHT = 900;
const G = 0.0022 * BASE_HEIGHT;
const JUMP_V = -0.045 * BASE_HEIGHT;
const MAX_FALL = 0.06 * BASE_HEIGHT;
const PLAYER_SIZE = 0.045 * BASE_HEIGHT;
const GROUND_RATIO = 0.78;
const GROUND_HEIGHT = 0.02 * BASE_HEIGHT;
const SPAWN_MIN = 700;
const SPAWN_MAX = 1200;
const COIN_CHANCE = 0.6;
const STAR_COUNT = 120;

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

// Строгая проверка «точка в равнобедренном треугольнике (апекс вверх)»,
// но без включения самой базовой линии (чтобы не «убивало» на самом основании).
// Дополнительно можем слегка «сжать» треугольник marginX/marginY для френдли-геймплея.
function pointInUpTriangleStrict(
  px: number,
  py: number,
  x: number,
  w: number,
  baseY: number,
  h: number,
  marginY: number,
  marginX: number
) {
  let x0 = x + marginX;
  let w0 = w - 2 * marginX;
  let baseY0 = baseY - marginY;
  let h0 = h - marginY;
  if (w0 <= 0 || h0 <= 0) return false;

  if (px <= x0 || px >= x0 + w0) return false;
  if (py <= baseY0 - h0 || py >= baseY0) return false; // NB: строго, база исключена

  const cx = x0 + w0 / 2;
  const dx = Math.abs(px - cx);
  const maxDy = (h0 * (w0 / 2 - dx)) / (w0 / 2);
  const triY = baseY0 - maxDy;
  return py > triY; // строго внутри
}

// Линейная геометрия: пересечение отрезков (для страховки пересечений граней)
function segIntersect(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  const abx = bx - ax, aby = by - ay, acx = cx - ax, acy = cy - ay, adx = dx - ax, ady = dy - ay;
  const cross1 = abx * acy - aby * acx;
  const cross2 = abx * ady - aby * adx;
  if ((cross1 > 0 && cross2 > 0) || (cross1 < 0 && cross2 < 0)) return false;
  const cdx = dx - cx, cdy = dy - cy, cax = ax - cx, cay = ay - cy, cbx = bx - cx, cby = by - cy;
  const cross3 = cdx * cay - cdy * cax;
  const cross4 = cdx * cby - cdy * cbx;
  if ((cross3 > 0 && cross4 > 0) || (cross3 < 0 && cross4 < 0)) return false;
  return true;
}

// Проверка пересечения прямоугольника (rx,ry,rw,rh) и «шипа» (треугольника):
// 1) любой угол прямоугольника строго внутри треугольника (без базы);
// 2) апекс треугольника внутри прямоугольника;
// 3) пересечение рёбер (игнорируем базу треугольника, чтобы не «убивало» по земле).
function rectSpikeIntersect(
  rx: number, ry: number, rw: number, rh: number,
  x: number, baseY: number, w: number, h: number,
  marginY: number, marginX: number
) {
  const corners: Vec2[] = [
    { x: rx, y: ry },
    { x: rx + rw, y: ry },
    { x: rx, y: ry + rh },
    { x: rx + rw, y: ry + rh },
  ];
  for (const c of corners) {
    if (pointInUpTriangleStrict(c.x, c.y, x, w, baseY, h, marginY, marginX)) return true;
  }
  // апекс
  const apexX = x + w / 2, apexY = baseY - h + marginY * 0.5;
  if (apexX > rx && apexX < rx + rw && apexY > ry && apexY < ry + rh) return true;

  // пересечение рёбер (только боковые грани треугольника)
  const Lx1 = x + marginX, Ly1 = baseY - 0.0001; // чуть выше базы, чтобы не ловить «по земле»
  const Lx2 = x + w / 2,   Ly2 = baseY - h + marginY;
  const Rx1 = x + w - marginX, Ry1 = baseY - 0.0001;
  const Rx2 = Lx2,            Ry2 = Ly2;

  const edges: [number, number, number, number][] = [
    [rx, ry, rx + rw, ry],             // top
    [rx, ry + rh, rx + rw, ry + rh],   // bottom
    [rx, ry, rx, ry + rh],             // left
    [rx + rw, ry, rx + rw, ry + rh],   // right
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    if (segIntersect(Lx1, Ly1, Lx2, Ly2, ex1, ey1, ex2, ey2)) return true;
    if (segIntersect(Rx1, Ry1, Rx2, Ry2, ex1, ey1, ex2, ey2)) return true;
  }
  return false;
}

// AABB пересечение
function aabb(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ---------- Главный компонент ----------

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // UI-состояния (для HUD и оверлеев)
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dead, setDead] = useState(false);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [high, setHigh] = useState(0);
  const [uiBlink, setUiBlink] = useState(0);

  // Те же значения — как .current, чтобы игровой цикл (внутри единственного useEffect) видел актуальные данные
  const startedRef = useRef(started);
  const pausedRef = useRef(paused);
  const deadRef = useRef(dead);
  const scoreRef = useRef(score);
  const coinsRefState = useRef(coins);
  const highRef = useRef(high);
  const uiBlinkRef = useRef(uiBlink);

  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { deadRef.current = dead; }, [dead]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { coinsRefState.current = coins; }, [coins]);
  useEffect(() => { highRef.current = high; }, [high]);
  useEffect(() => { uiBlinkRef.current = uiBlink; }, [uiBlink]);

  // Игровые рефы (мир)
  const playerRef = useRef<Player | null>(null);
  const worldXRef = useRef(0);
  const speedRef = useRef(0.34 * BASE_HEIGHT / 1000);
  const baseSpeedRef = useRef(0.34 * BASE_HEIGHT / 1000);
  const lastMsRef = useRef(0);
  const groundYRef = useRef(0);
  const obstaclesRef = useRef<(RectObstacle | SpikeObstacle)[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextSpawnAtRef = useRef(900);
  const isPressedRef = useRef(false);
  const starsRef = useRef<{ x: number; y: number; z: number }[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const cvs = canvasRef.current!;
    const ctx = cvs.getContext("2d")!;

    // Retina-скейл + ресайз
    function resize() {
      const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const rect = cvs.getBoundingClientRect();
      const w = Math.max(640, Math.floor(rect.width));
      const h = Math.max(420, Math.floor(rect.height));
      cvs.width = Math.floor(w * DPR);
      cvs.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      groundYRef.current = h * GROUND_RATIO;
      baseSpeedRef.current = 0.34 * h / 1000;
      if (!startedRef.current) speedRef.current = baseSpeedRef.current;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(cvs);
    resize();

    // Звезды
    if (starsRef.current.length === 0) {
      const rect = cvs.getBoundingClientRect();
      for (let i = 0; i < STAR_COUNT; i++) {
        starsRef.current.push({ x: Math.random() * rect.width, y: Math.random() * rect.height, z: rand(0.2, 1.2) });
      }
    }

    // Игрок
    resetGame();

    // --- Контролы ---
    function onDown(e: Event) {
      e.preventDefault();
      isPressedRef.current = true;
      tryJump();
    }
    function onUp() { isPressedRef.current = false; }
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") {
        if (e.type === "keydown") {
          e.preventDefault(); isPressedRef.current = true; tryJump();
        } else if (e.type === "keyup") {
          isPressedRef.current = false;
        }
      }
      if (e.type === "keydown") {
        if (e.code === "KeyP") togglePause();
        else if (e.code === "KeyR") restart();
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
      nextSpawnAtRef.current = rect.width * 1.0;
      scoreRef.current = 0; setScore(0);
      coinsRefState.current = 0; setCoins(0);
      setDead(false); deadRef.current = false;
    }

    function togglePause() {
      if (!startedRef.current) return;
      setPaused(p => { const v = !p; pausedRef.current = v; return v; });
    }

    function restart() {
      setStarted(true); startedRef.current = true;
      setPaused(false); pausedRef.current = false;
      resetGame();
      speedRef.current = baseSpeedRef.current;
      uiBlinkRef.current = 1; setUiBlink(1);
    }

    function tryJump() {
      if (!startedRef.current) {
        setStarted(true); startedRef.current = true;
        setPaused(false); pausedRef.current = false;
        resetGame();
        uiBlinkRef.current = 1; setUiBlink(1);
        return;
      }
      if (pausedRef.current || deadRef.current) return;
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
          x, y,
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
          x, y,
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

      const isSpike = Math.random() < 0.55;
      if (isSpike) {
        const w = rand(50, 90) * (H / BASE_HEIGHT);
        const h = rand(60, 140) * (H / BASE_HEIGHT);
        obstaclesRef.current.push({ kind: "spike", x: atWorldX, w, h });
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

      if (!startedRef.current || pausedRef.current) {
        draw(dt, true);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      dt = clamp(dt, 0, 32);
      update(dt);
      draw(dt, false);
      rafRef.current = requestAnimationFrame(tick);
    }

    function update(dt: number) {
      const rect = cvs.getBoundingClientRect();
      const H = rect.height;
      const p = playerRef.current!;

      // ускорение
      speedRef.current += (0.0000022 * H) * (dt / 16.67) / 1000;

      const worldShift = speedRef.current * dt;
      worldXRef.current += worldShift;

      ensureSpawn(worldXRef.current);

      // физика игрока
      p.vy += (G * (H / BASE_HEIGHT)) * (dt / 16.67);
      p.vy = clamp(p.vy, -Infinity, (MAX_FALL * (H / BASE_HEIGHT)));
      p.y += p.vy * (dt / 16.67);

      const gY = groundYRef.current - p.h;
      if (p.y >= gY) {
        if (!p.onGround) spawnDust(p.x + p.w * 0.2, groundYRef.current, 14, 180);
        p.y = gY;
        p.vy = 0;
        p.onGround = true;
      } else {
        p.onGround = false;
      }

      if (!p.onGround) p.rotation += 0.015 * dt;
      else p.rotation *= 0.7;

      const leftX = worldXRef.current - rect.width * 0.2;
      const rightX = worldXRef.current + rect.width * 1.2;

      // ВАЖНО: проекция мировых X на экран — относительно X игрока (визуал == физика)
      const viewX = (x: number) => x - worldXRef.current + p.x;

      obstaclesRef.current = obstaclesRef.current.filter((o) => o.x + o.w > leftX - 200 && o.x < rightX + 200);

      // Немного «мягче» хитбокс игрока
      const pad = Math.min(p.w, p.h) * 0.12;
      const px = p.x + pad, py = p.y + pad, pw = p.w - 2 * pad, ph = p.h - 2 * pad;

      // Коллизии
      let died = false;

      for (const o of obstaclesRef.current) {
        const ox = viewX(o.x);
        const oy = groundYRef.current;

        if (o.kind === "rect") {
          const ro = o as RectObstacle;
          if (aabb(px, py, pw, ph, ox, oy - ro.h, ro.w, ro.h)) {
            died = true; break;
          }
        } else {
          const so = o as SpikeObstacle;
          // Быстрое бб-окно
          if (aabb(px, py, pw, ph, ox, oy - so.h, so.w, so.h)) {
            // «Дружественная» проверка треугольника без базы
            const marginY = Math.max(2, H * 0.008);
            const marginX = Math.max(1, so.w * 0.06);
            if (rectSpikeIntersect(px, py, pw, ph, ox, oy, so.w, so.h, marginY, marginX)) {
              died = true; break;
            }
          }
        }
        // очки
        if (!o.passed && viewX(o.x + o.w) < p.x) {
          o.passed = true;
          const ns = scoreRef.current + 1; scoreRef.current = ns; setScore(ns);
        }
      }

      // Монеты
      for (const c of coinsRef.current) c.phase += 0.02 * dt;
      coinsRef.current = coinsRef.current.filter((c) => c.x > leftX - 100 && c.x < rightX + 100 && !c.taken);
      for (const c of coinsRef.current) {
        const cx = viewX(c.x), cy = c.y;
        if (aabb(px, py, pw, ph, cx - c.r, cy - c.r, 2 * c.r, 2 * c.r)) {
          c.taken = true;
          const nk = coinsRefState.current + 1; coinsRefState.current = nk; setCoins(nk);
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
        setDead(true); deadRef.current = true;
        setPaused(false); pausedRef.current = false;
        // рекорд
        setHigh((h) => {
          const nxt = Math.max(h, scoreRef.current);
          try { localStorage.setItem("dash_highscore", String(nxt)); } catch {}
          highRef.current = nxt;
          return nxt;
        });
        spawnExplosion(p.x + p.w / 2, p.y + p.h / 2);
      }

      // автопрыжок при удержании
      if (isPressedRef.current && p.onGround && !deadRef.current) {
        tryJump();
      }
    }

    function draw(dt: number, frozen: boolean) {
      const rect = cvs.getBoundingClientRect();
      const W = rect.width, H = rect.height;
      const ctx = cvs.getContext("2d")!;

      // фон
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#090915");
      grad.addColorStop(0.5, "#0b0b1c");
      grad.addColorStop(1, "#0d0d22");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // звезды
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

      // земля
      const gY = groundYRef.current;
      drawNeonGround(ctx, W, H, gY);

      const p = playerRef.current!;
      const viewX = (x: number) => x - worldXRef.current + p.x;

      // монеты
      for (const c of coinsRef.current) {
        const cx = viewX(c.x);
        const pul = (Math.sin(c.phase) * 0.3 + 0.7);
        drawCoin(ctx, cx, c.y, c.r * pul);
      }

      // препятствия
      for (const o of obstaclesRef.current) {
        const ox = viewX(o.x);
        if (o.kind === "rect") drawRectObstacle(ctx, ox, gY, o.w, (o as RectObstacle).h);
        else drawSpikeObstacle(ctx, ox, gY, o.w, (o as SpikeObstacle).h);
      }

      // игрок
      drawPlayer(ctx, p);

      // частицы
      for (const pt of particlesRef.current) drawParticle(ctx, pt);

      // HUD
      drawHUD(ctx, W, H);

      // Оверлеи
      drawOverlays(ctx, W, H);

      // UI blink
      if (uiBlinkRef.current > 0) {
        const t = easeOutCubic(uiBlinkRef.current);
        ctx.fillStyle = `rgba(90,247,255,${t * 0.15})`;
        ctx.fillRect(0, 0, W, H);
        uiBlinkRef.current = Math.max(0, uiBlinkRef.current - 0.04 * (dt / 16.67));
        setUiBlink(uiBlinkRef.current);
      }
    }

    function drawNeonGround(ctx: CanvasRenderingContext2D, W: number, H: number, gY: number) {
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
      ctx.save();
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, "#132f3a");
      grad.addColorStop(1, "#0d1d24");
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, w, h, r);
      ctx.fill();
      ctx.strokeStyle = "#34f1ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#5af7ff";
      roundRect(ctx, x + 4, y + 4, w - 8, 10, 6);
      ctx.fill();
      ctx.restore();
    }

    function drawSpikeObstacle(ctx: CanvasRenderingContext2D, x: number, baseY: number, w: number, h: number) {
      const cx = x + w / 2;
      ctx.save();
      ctx.shadowColor = "#2ee7ff";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#0c2530";
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + w, baseY);
      ctx.lineTo(cx, baseY - h);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#2ee7ff";
      ctx.lineWidth = 2;
      ctx.stroke();
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
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 18;
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rotation);
      ctx.translate(-p.w / 2, -p.h / 2);
      const grad = ctx.createLinearGradient(0, 0, 0, p.h);
      grad.addColorStop(0, "#0d3940");
      grad.addColorStop(1, "#0b2930");
      ctx.fillStyle = grad;
      roundRect(ctx, 0, 0, p.w, p.h, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      roundRect(ctx, 0, 0, p.w, p.h, 8);
      ctx.stroke();
      ctx.fillStyle = "#5af7ff";
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(p.w * 0.33, p.h * 0.42, p.w * 0.09, 0, Math.PI * 2);
      ctx.arc(p.w * 0.67, p.h * 0.42, p.w * 0.09, 0, Math.PI * 2);
      ctx.fill();
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
      // подхват рекорда
      if (!highRef.current) {
        try {
          const v = Number(localStorage.getItem("dash_highscore") || 0);
          if (!isNaN(v) && v > 0) { highRef.current = v; setHigh(v); }
        } catch {}
      }
      ctx.save();
      ctx.font = "600 16px ui-sans-serif, system-ui, -apple-system, Segoe UI";
      ctx.fillStyle = "#c8f7ff";
      ctx.shadowColor = "#34f1ff";
      ctx.shadowBlur = 10;
      ctx.textAlign = "left";
      const pad = 16;
      ctx.fillText(`SCORE: ${scoreRef.current}`, pad, 28);
      ctx.fillText(`COINS: ${coinsRefState.current}`, pad, 50);
      ctx.textAlign = "right";
      ctx.fillText(`BEST: ${Math.max(highRef.current, scoreRef.current)}`, W - pad, 28);

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
      if (startedRef.current && !pausedRef.current && !deadRef.current) return;

      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, 0, W, H);
      ctx.shadowColor = "#34f1ff";
      ctx.shadowBlur = 22;
      ctx.fillStyle = "#d9fbff";
      ctx.textAlign = "center";

      if (!startedRef.current) {
        drawTitle(ctx, W, H, "NEON DASH");
        drawSub(ctx, W, H, "Space / ↑ / Click / Tap — Прыжок  |  P — Пауза  |  R — Рестарт");
        drawButton(ctx, W, H, "НАЧАТЬ", 0.62, () => {
          setStarted(true); startedRef.current = true;
          setPaused(false); pausedRef.current = false;
          resetGame();
          uiBlinkRef.current = 1; setUiBlink(1);
        });
      } else if (pausedRef.current && !deadRef.current) {
        drawTitle(ctx, W, H, "ПАУЗА");
        drawSub(ctx, W, H, "Нажми P чтобы продолжить");
      } else if (deadRef.current) {
        drawTitle(ctx, W, H, "ПОРАЖЕНИЕ");
        drawSub(ctx, W, H, "R — рестарт  |  Esc — меню");
        drawButton(ctx, W, H, "ЕЩЁ РАЗ", 0.62, () => {
          setDead(false); deadRef.current = false;
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

      const grd = ctx.createLinearGradient(x, y, x + bw, y + bh);
      grd.addColorStop(0, "#32ffd2");
      grd.addColorStop(1, "#34f1ff");
      ctx.fillStyle = grd;
      roundRect(ctx, x, y, bw, bh, 12);
      ctx.fill();

      ctx.save();
      ctx.fillStyle = "#071319";
      ctx.font = "800 20px ui-sans-serif, system-ui, -apple-system, Segoe UI";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + bw / 2, y + bh / 2);
      ctx.restore();

      const listener = (ev: MouseEvent | PointerEvent) => {
        const r = canvasRef.current!.getBoundingClientRect();
        const px = (ev as PointerEvent).clientX - r.left;
        const py = (ev as PointerEvent).clientY - r.top;
        if (px >= x && px <= x + bw && py >= y && py <= y + bh) {
          onClick();
        }
      };
      // ВАЖНО: добавляем одноразовый слушатель
      window.addEventListener("pointerdown", listener, { once: true });
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
  // Монтируем ОДИН РАЗ
  }, []);

  // ---------- Разметка ----------
  return (
    <div className="min-h-[60vh] w-full" style={{ display: "grid", placeItems: "center", background: "#05050b" }}>
      <div style={{ width: "min(100%, 1100px)", aspectRatio: "16/9", position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block", borderRadius: 18, boxShadow: "0 20px 80px rgba(52,241,255,.12), inset 0 0 0 1px rgba(52,241,255,.15)" }}
        />
        {/* Декор */}
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
