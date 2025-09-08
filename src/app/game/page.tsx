// src/app/game/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./mini.css";

/* ===== Типы ===== */
type Screen =
  | "menu"
  | "game"
  | "paused"
  | "garage"
  | "settings"
  | "help"
  | "gameover"
  | "leaders";
type Env = "day" | "night" | "rain";
type Obstacle = { lane: number; y: number; w: number; h: number; color: string; speedMul: number };
type MissionState = {
  distance: number; // метры (аккумулируем)
  laneChanges: number;
  nearMiss: number;
  uturns: number;
  combosBest: number;
};
type DailyQuest = { id: string; title: string; goal: number; progress: number; done: boolean };
type Leader = { uid: number; name: string; score: number; ts: number };

export default function GamePage() {
  /* ===== Canvas / refs ===== */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const garageCanvasRef = useRef<HTMLCanvasElement | null>(null);

  /* ===== UI state ===== */
  const [screen, setScreen] = useState<Screen>("menu");
  const [env, setEnv] = useState<Env>("day");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [daily, setDaily] = useState<DailyQuest[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [missions, setMissions] = useState<MissionState>({
    distance: 0,
    laneChanges: 0,
    nearMiss: 0,
    uturns: 0,
    combosBest: 0,
  });

  /* ===== Пользователь/профиль ===== */
  const [carColor, setCarColor] = useState("#ff3b30");
  const userRef = useRef<{ id?: number; username?: string } | null>(null);

  /* ===== Настройки ===== */
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [tiltSensitivity, setTiltSensitivity] = useState(0.8);

  /* ===== Игровые refs ===== */
  const speedRef = useRef(320); // px/sec
  const laneTargetRef = useRef(1); // 0..2
  const laneXAnimRef = useRef(0); // px
  const orientTargetRef = useRef(0); // 0/90/-90/180
  const orientAnimRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const lastTsRef = useRef<number>(0);
  const dprRef = useRef(1);
  const lanePositionsRef = useRef<number[]>([0, 0, 0]);
  const gameRunningRef = useRef(false);
  const scoreAccRef = useRef(0); // сглаженный счёт
  const comboRef = useRef(0); // комбо за near-miss
  const lastLaneChangeYRef = useRef<number | null>(null); // для near-miss проверки
  const raindropsRef = useRef<{ x: number; y: number; vx: number; vy: number }[]>([]);
  const canvasSizeRef = useRef({ cssW: 0, cssH: 0 });

  /* ===== Миссии: аккумулирование и редкие батчи ===== */
  const missionAccRef = useRef<MissionState>({
    distance: 0,
    laneChanges: 0,
    nearMiss: 0,
    uturns: 0,
    combosBest: 0,
  });
  const missionFlushTimerRef = useRef(0);

  /* ===== Touch helpers ===== */
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const doubleTapRef = useRef<number>(0);

  /* ===== Telegram & Haptics ===== */
  const tg = (globalThis as any)?.Telegram?.WebApp;
  const haptic = (type: "soft" | "light" | "medium" | "heavy" | "rigid" = "light") =>
    tg?.HapticFeedback?.impactOccurred?.(type);

  /* ===== WebAudio ===== */
  const audioRef = useRef<AudioContext | null>(null);
  const ensureAudio = () => {
    if (!audioRef.current) {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) audioRef.current = new Ctx();
    }
  };
  const tone = (
    freq: number,
    dur = 0.12,
    type: OscillatorType = "sine",
    gainVal = 0.08,
  ) => {
    ensureAudio();
    const ctx = audioRef.current!;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gainVal;
    osc.connect(g).connect(ctx.destination);
    const t = ctx.currentTime;
    osc.start(t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.stop(t + dur + 0.05);
  };
  const clickSnd = () => tone(400, 0.08, "square", 0.05);
  const turnSnd = () => tone(520, 0.12, "triangle", 0.06);
  const nearMissSnd = () => {
    tone(900, 0.1, "sine", 0.06);
    tone(1200, 0.08, "sine", 0.04);
  };
  const crashSnd = () => {
    ensureAudio();
    const ctx = audioRef.current!;
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.12));
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = 0.15;
    src.buffer = buffer;
    src.connect(g).connect(ctx.destination);
    const t = ctx.currentTime;
    src.start(t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  };

  /* ===== Цвета в гараже ===== */
  const colourOptions = useMemo(
    () => [
      "#ff3b30",
      "#007aff",
      "#34c759",
      "#ffa600",
      "#8e8e93",
      "#bf5af2",
      "#0fb9b1",
      "#ffd166",
      "#06b6d4",
    ],
    [],
  );

  /* ===== Telegram тема + initData ===== */
  useEffect(() => {
    if (!tg) return;
    tg.ready();
    const p = tg.themeParams || {};
    const root = document.documentElement;
    Object.entries(p).forEach(([k, v]) => root.style.setProperty(`--tg-${k}`, String(v)));
    root.style.setProperty("--button-bg", (p.button_color as string) || "#1f2937");
    root.style.setProperty("--button-fg", (p.button_text_color as string) || "#ffffff");
    root.style.setProperty("--canvas-bg", (p.secondary_bg_color as string) || "#0b1220");

    const u = tg.initDataUnsafe?.user;
    if (u?.id) userRef.current = { id: u.id, username: u.username };
  }, [tg]);

  /* ===== Daily quests ===== */
  function buildDaily(seed = new Date()) {
    const dayKey = seed.toISOString().slice(0, 10);
    const saved = localStorage.getItem("runner_daily");
    if (saved) {
      try {
        const o = JSON.parse(saved);
        if (o.date === dayKey && Array.isArray(o.items)) {
          setDaily(o.items);
          return;
        }
      } catch {}
    }
    const items: DailyQuest[] = [
      { id: "d1", title: "Пройди 1000 м", goal: 1000, progress: 0, done: false },
      { id: "d2", title: "Сделай 10 перестроений", goal: 10, progress: 0, done: false },
      { id: "d3", title: "Сделай 3 разворота", goal: 3, progress: 0, done: false },
    ];
    localStorage.setItem("runner_daily", JSON.stringify({ date: dayKey, items }));
    setDaily(items);
  }

  /* ===== Загрузка best/profile (локально) ===== */
  useEffect(() => {
    buildDaily();
    const uid = userRef.current?.id;
    const bestKey = uid ? `runner_best_${uid}` : "runner_best";
    const profileKey = uid ? `runner_profile_${uid}` : "runner_profile";
    setBest(Number(localStorage.getItem(bestKey) || "0"));
    try {
      const p = localStorage.getItem(profileKey);
      if (p) {
        const o = JSON.parse(p);
        if (o?.carColor) setCarColor(o.carColor);
        if (o?.env) setEnv(o.env as Env);
        if (o?.missions) setMissions(o.missions as MissionState);
      }
    } catch {}
  }, []);

  /* ===== Сохранение профиля локально + на бек ===== */
  async function saveProfile(partial?: Partial<{ carColor: string; best: number; env: Env; missions: MissionState }>) {
    const uid = userRef.current?.id;
    const profileKey = uid ? `runner_profile_${uid}` : "runner_profile";
    const bestKey = uid ? `runner_best_${uid}` : "runner_best";

    // best
    if (partial?.best !== undefined) {
      localStorage.setItem(bestKey, String(partial.best));
      setBest(partial.best);
    }

    // missions/env/color
    const nextProfile = {
      carColor: partial?.carColor ?? carColor,
      env: partial?.env ?? env,
      missions: partial?.missions ?? missions,
    };
    localStorage.setItem(profileKey, JSON.stringify(nextProfile));

    // бек
    try {
      await fetch("/api/runner/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData: (globalThis as any)?.Telegram?.WebApp?.initData || "",
          profile: { ...nextProfile, best: partial?.best ?? best },
        }),
      });
    } catch {}
  }

  /* ===== Resize/DPR ===== */
  function resizeCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const cssW = Math.min(window.innerWidth, 560);
    const cssH = Math.min(Math.floor(window.innerHeight * 0.77), 860);
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    dprRef.current = dpr;

    c.style.width = `${cssW}px`;
    c.style.height = `${cssH}px`;
    c.width = Math.floor(cssW * dpr);
    c.height = Math.floor(cssH * dpr);

    canvasSizeRef.current = { cssW, cssH };

    const laneCount = 3;
    const carW = 46;
    const laneW = cssW / laneCount;
    lanePositionsRef.current = new Array(laneCount)
      .fill(0)
      .map((_, i) => i * laneW + (laneW - carW) / 2);

    laneXAnimRef.current = lanePositionsRef.current[laneTargetRef.current];
    drawGaragePreview();
  }

  useEffect(() => {
    if (!canvasRef.current) return;
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("orientationchange", resizeCanvas);
    };
  }, []);

  /* ===== Игровой цикл (фиксы!) ===== */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const _ctx = canvas.getContext("2d");
    if (!(_ctx instanceof CanvasRenderingContext2D)) return;
    const ctx: CanvasRenderingContext2D = _ctx;
    if (!ctx) return;
    let raf = 0;

    const line = { y: 0, spacing: 92, len: 34 };
    const car = { w: 46, h: 78 };

    // дождь подготовим при входе
    if (env === "rain" && raindropsRef.current.length === 0) {
      const count = Math.floor((canvas.width / dprRef.current) * 0.6);
      for (let i = 0; i < count; i++) {
        raindropsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: -120 - Math.random() * 60,
          vy: 520 + Math.random() * 220,
        });
      }
    }

    const resetGame = () => {
      obstaclesRef.current = [];
      scoreAccRef.current = 0;
      setScore(0);
      speedRef.current = 300;
      laneTargetRef.current = 1;
      orientTargetRef.current = 0;
      orientAnimRef.current = 0;
      laneXAnimRef.current = lanePositionsRef.current[1];
      lastTsRef.current = performance.now();
      comboRef.current = 0;
      lastLaneChangeYRef.current = null;
      // миссионные аккумуляторы
      missionAccRef.current = { distance: 0, laneChanges: 0, nearMiss: 0, uturns: 0, combosBest: 0 };
      missionFlushTimerRef.current = performance.now();
    };

    const spawnObstacle = (w: number, h: number) => {
      const lane = Math.floor(Math.random() * 3);
      const color = ["#2f374a", "#202634", "#121722"][Math.floor(Math.random() * 3)];
      const speedMul = 0.65 + Math.random() * 0.85;
      obstaclesRef.current.push({ lane, y: -h - 50, w, h, color, speedMul });
    };

    let spawnAcc = 0;
    const ease = (from: number, to: number, k = 0.18) => from + (to - from) * k;

    const roundRect = (
      ctx2: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
    ) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx2.beginPath();
      ctx2.moveTo(x + rr, y);
      ctx2.arcTo(x + w, y, x + w, y + h, rr);
      ctx2.arcTo(x + w, y + h, x, y + h, rr);
      ctx2.arcTo(x, y + h, x, y, rr);
      ctx2.arcTo(x, y, x + w, y, rr);
      ctx2.closePath();
    };

    const lighten = (hex: string, k = 0.1) => shade(hex, -k);
    const darken = (hex: string, k = 0.1) => shade(hex, k);
    const shade = (hex: string, k: number) => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!m) return hex;
      const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
      const t = (x: number) => Math.max(0, Math.min(255, Math.round(x * (1 + k))));
      return `#${t(r).toString(16).padStart(2, "0")}${t(g).toString(16).padStart(2, "0")}${t(b)
        .toString(16)
        .padStart(2, "0")}`;
    };

    const drawCar = (x: number, y: number) => {
      const angle = (orientAnimRef.current * Math.PI) / 180;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // тень
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#000";
      roundRect(ctx, -car.w / 2, -car.h / 2 + 5, car.w, car.h, 12);
      ctx.fill();
      ctx.globalAlpha = 1;

      // корпус (градиент ярче)
      const grad = ctx.createLinearGradient(-car.w / 2, -car.h / 2, car.w / 2, car.h / 2);
      grad.addColorStop(0, lighten(carColor, 0.12));
      grad.addColorStop(1, darken(carColor, 0.15));
      ctx.fillStyle = grad;
      roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 12);
      ctx.fill();

      // стекло
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      roundRect(ctx, -car.w / 2 + 6, -car.h / 2 + 12, car.w - 12, car.h - 24, 10);
      ctx.fill();

      // фары / стопы (блики)
      const forward = Math.abs(orientTargetRef.current) !== 180;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (forward) {
        ctx.fillStyle = "rgba(255, 244, 180, 0.28)";
        ctx.fillRect(-car.w / 4, -car.h / 2 - 3, car.w / 2, 6);
      } else {
        ctx.fillStyle = "rgba(255, 90, 95, 0.35)";
        ctx.fillRect(-car.w / 4, car.h / 2 - 3, car.w / 2, 6);
      }
      ctx.restore();

      ctx.restore();
    };

    const drawEnv = (cssW: number, cssH: number, dt: number) => {
      if (env === "day") {
        const g = ctx.createLinearGradient(0, 0, 0, cssH);
        g.addColorStop(0, "#2d3b6e");
        g.addColorStop(1, "#111626");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cssW, cssH);
      } else if (env === "night") {
        const g = ctx.createRadialGradient(cssW * 0.5, -cssH * 0.3, 20, cssW * 0.5, cssH * 0.5, cssH);
        g.addColorStop(0, "#0f1022");
        g.addColorStop(1, "#060714");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cssW, cssH);
        // звёзды
        ctx.globalAlpha = 0.18;
        for (let i = 0; i < 40; i++) {
          const x = (i * 97) % cssW;
          const y = (i * 197) % (cssH * 0.6);
          ctx.fillStyle = i % 3 === 0 ? "#8ab4ff" : "#e5e7eb";
          ctx.fillRect(x, y, 2, 2);
        }
        ctx.globalAlpha = 1;
      } else {
        // дождь
        const g = ctx.createLinearGradient(0, 0, 0, cssH);
        g.addColorStop(0, "#122131");
        g.addColorStop(1, "#0a1320");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cssW, cssH);

        // капли
        ctx.strokeStyle = "rgba(180,200,255,0.35)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (const d of raindropsRef.current) {
          d.x += d.vx * dt * 0.9;
          d.y += d.vy * dt * 0.9;
          if (d.y > cssH + 20 || d.x < -20) {
            d.x = Math.random() * cssW;
            d.y = -10;
          }
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + 4, d.y + 10);
        }
        ctx.stroke();
      }

      // разделители полос
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      for (let i = 1; i < 3; i++) {
        const x = (cssW / 3) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cssH);
        ctx.stroke();
      }

      // бегущая центральная метка
      line.y += speedRef.current * dt * 0.9;
      line.y %= line.spacing;
      ctx.fillStyle = "#e5e7eb";
      for (let y = -line.len; y < cssH + line.len; y += line.spacing) {
        ctx.fillRect(cssW / 2 - 2, y + line.y, 4, line.len);
      }
    };

    const headlights = (cssW: number, cssH: number, carX: number, carY: number) => {
      if (env !== "night" && env !== "rain") return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const grad = ctx.createRadialGradient(carX, carY - 20, 0, carX, carY - 20, 220);
      grad.addColorStop(0, "rgba(255,240,180,0.38)");
      grad.addColorStop(1, "rgba(255,240,180,0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.restore();
    };

    const addScore = (v: number) => {
      scoreAccRef.current += v;
      setScore(Math.floor(scoreAccRef.current));
    };

    const submitScoreNet = async (finalScore: number) => {
      try {
        await fetch("/api/runner/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            initData: (globalThis as any)?.Telegram?.WebApp?.initData || "",
            score: finalScore,
          }),
        });
      } catch {}
    };

    const gameOver = async () => {
      haptic("heavy");
      crashSnd();
      gameRunningRef.current = false;
      cancelAnimationFrame(raf);

      const final = Math.floor(scoreAccRef.current);

      // рекорд и сохранение
      setBest((prev) => {
        const v = Math.max(prev, final);
        const uid = userRef.current?.id;
        localStorage.setItem(uid ? `runner_best_${uid}` : "runner_best", String(v));
        saveProfile({ best: v, missions }); // сохранение профиля с миссиями
        return v;
      });

      // daily обновления (дистанция)
      setDaily((items) => {
        const upd = items.map((q) => {
          if (q.id === "d1") {
            const prog = Math.min(q.goal, Math.floor(missions.distance));
            return { ...q, progress: prog, done: prog >= q.goal };
          }
          return q;
        });
        const dayKey = new Date().toISOString().slice(0, 10);
        localStorage.setItem("runner_daily", JSON.stringify({ date: dayKey, items: upd }));
        return upd;
      });

      await submitScoreNet(final);
      setScreen("gameover");
    };

    function loop(ts: number) {
      const ctx2 = ctx;
      const dpr = dprRef.current;
      const cssW = Math.floor(canvas!.width / dpr);
      const cssH = Math.floor(canvas!.height / dpr);
      const dt = Math.min(0.033, (ts - (lastTsRef.current || ts)) / 1000);
      lastTsRef.current = ts;

      // фон
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2.clearRect(0, 0, cssW, cssH);
      drawEnv(cssW, cssH, dt);

      // плавности
      const targetX = lanePositionsRef.current[laneTargetRef.current] + car.w / 2;
      laneXAnimRef.current = ease(laneXAnimRef.current, targetX, 0.22);
      orientAnimRef.current = ease(orientAnimRef.current, orientTargetRef.current, 0.2);

      // машина
      const carX = laneXAnimRef.current;
      const carY = cssH - car.h / 2 - 26;
      drawCar(carX, carY);
      headlights(cssW, cssH, carX, carY);

      // препятствия
      spawnAcc += dt;
      const spawnEvery = Math.max(0.5, 1.5 - score * 0.0016);
      if (spawnAcc >= spawnEvery) {
        spawnAcc = 0;
        const ow = [40, 48, 56][Math.floor(Math.random() * 3)];
        const oh = [60, 72, 86][Math.floor(Math.random() * 3)];
        spawnObstacle(ow, oh);
      }

      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const o = obstaclesRef.current[i];
        const laneX = lanePositionsRef.current[o.lane] + o.w / 2;
        o.y += speedRef.current * o.speedMul * dt;

        // тень
        ctx2.globalAlpha = 0.22;
        ctx2.fillStyle = "#000";
        roundRect(ctx2, laneX - o.w / 2, o.y - o.h / 2 + 5, o.w, o.h, 9);
        ctx2.fill();
        ctx2.globalAlpha = 1;

        // корпус
        ctx2.fillStyle = o.color;
        roundRect(ctx2, laneX - o.w / 2, o.y - o.h / 2, o.w, o.h, 9);
        ctx2.fill();

        if (o.y - o.h / 2 > cssH + 10) {
          obstaclesRef.current.splice(i, 1);
          addScore(8);
        }
      }

      // столкновения + near-miss
      const my = { x: carX - car.w / 2, y: carY - car.h / 2, w: car.w, h: car.h };
      for (const o of obstaclesRef.current) {
        const ox = lanePositionsRef.current[o.lane];
        const ob = { x: ox, y: o.y - o.h / 2, w: o.w, h: o.h };
        if (rectsIntersect(my, ob)) {
          gameOver();
          return;
        }
        if (lastLaneChangeYRef.current !== null) {
          const dy = Math.abs(o.y - my.y);
          if (dy < 70) {
            comboRef.current += 1;
            missionAccRef.current.nearMiss += 1;
            missionAccRef.current.combosBest = Math.max(
              missionAccRef.current.combosBest,
              comboRef.current,
            );
            nearMissSnd();
            addScore(50 * comboRef.current);
            lastLaneChangeYRef.current = null;
          }
        }
      }

      // очки по дистанции
      scoreAccRef.current += speedRef.current * dt * 0.18;
      setScore(Math.floor(scoreAccRef.current));

      // миссии: аккумулируем и батчим не чаще, чем раз в 250мс
      missionAccRef.current.distance += speedRef.current * dt;
      if (performance.now() - missionFlushTimerRef.current > 250) {
        missionFlushTimerRef.current = performance.now();
        setMissions((m) => ({
          distance: m.distance + missionAccRef.current.distance,
          laneChanges: m.laneChanges + missionAccRef.current.laneChanges,
          nearMiss: m.nearMiss + missionAccRef.current.nearMiss,
          uturns: m.uturns + missionAccRef.current.uturns,
          combosBest: Math.max(m.combosBest, missionAccRef.current.combosBest),
        }));
        missionAccRef.current = {
          distance: 0,
          laneChanges: 0,
          nearMiss: 0,
          uturns: 0,
          combosBest: 0,
        };
      }

      // скорость растёт
      speedRef.current = Math.min(720, speedRef.current + dt * 5.0);

      if (gameRunningRef.current) raf = requestAnimationFrame(loop);
    }

    const start = () => {
      resetGame();
      gameRunningRef.current = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      gameRunningRef.current = false;
      cancelAnimationFrame(raf);
    };

    if (screen === "game") start();
    else stop();

    return () => cancelAnimationFrame(raf);
  }, [screen, carColor, env]); // ВАЖНО: missions НЕ ДОЛЖЕН быть зависимостью!

  /* ===== Helpers ===== */
  function rectsIntersect(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
  ) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function lighten(hex: string, k = 0.1) {
    return shade(hex, -k);
  }
  function darken(hex: string, k = 0.1) {
    return shade(hex, k);
  }
  function shade(hex: string, k: number) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    const t = (x: number) => Math.max(0, Math.min(255, Math.round(x * (1 + k))));
    return `#${t(r).toString(16).padStart(2, "0")}${t(g).toString(16).padStart(2, "0")}${t(b)
      .toString(16)
      .padStart(2, "0")}`;
  }

  /* ===== Управление ===== */
  const moveLane = (dir: -1 | 1) => {
    const next = Math.max(0, Math.min(2, laneTargetRef.current + dir));
    if (next !== laneTargetRef.current) {
      laneTargetRef.current = next;
      // для near-miss: фиксируем Y текущей позиции машины (нижняя часть экрана)
      lastLaneChangeYRef.current = canvasSizeRef.current.cssH - 26 - 39;
      missionAccRef.current.laneChanges += 1;
      comboRef.current = 0; // новая серия near-miss
      haptic("light");
      clickSnd();

      // daily: перестроения
      setDaily((items) => {
        const upd = items.map((q) =>
          q.id === "d2"
            ? {
                ...q,
                progress: Math.min(q.goal, q.progress + 1),
                done: q.progress + 1 >= q.goal,
              }
            : q,
        );
        const dayKey = new Date().toISOString().slice(0, 10);
        localStorage.setItem("runner_daily", JSON.stringify({ date: dayKey, items: upd }));
        return upd;
      });
    }
  };
  const turnLeft = () => {
    const seq = [0, 90, 180, -90] as const;
    const i = seq.indexOf(orientTargetRef.current as any);
    orientTargetRef.current = seq[(i - 1 + seq.length) % seq.length];
    haptic("soft");
    turnSnd();
  };
  const turnRight = () => {
    const seq = [0, 90, 180, -90] as const;
    const i = seq.indexOf(orientTargetRef.current as any);
    orientTargetRef.current = seq[(i + 1) % seq.length];
    haptic("soft");
    turnSnd();
  };
  const uTurn = () => {
    orientTargetRef.current = Math.abs(orientTargetRef.current) === 180 ? 0 : 180;
    missionAccRef.current.uturns += 1;
    haptic("medium");
    turnSnd();

    // daily: развороты
    setDaily((items) => {
      const upd = items.map((q) =>
        q.id === "d3"
          ? {
              ...q,
              progress: Math.min(q.goal, q.progress + 1),
              done: q.progress + 1 >= q.goal,
            }
          : q,
      );
      const dayKey = new Date().toISOString().slice(0, 10);
      localStorage.setItem("runner_daily", JSON.stringify({ date: dayKey, items: upd }));
      return upd;
    });
  };

  // Тач-события только на канве (кнопки — автономно)
  const onTouchStartCanvas: React.TouchEventHandler = (e) => {
    ensureAudio(); // iOS — первый тап активирует звук
    const t = e.changedTouches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: performance.now() };
  };
  const onTouchEndCanvas: React.TouchEventHandler = (e) => {
    const s = touchStartRef.current;
    touchStartRef.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;

    // двойной тап — разворот
    const now = performance.now();
    if (now - doubleTapRef.current < 260) {
      doubleTapRef.current = 0;
      uTurn();
      return;
    }
    doubleTapRef.current = now;

    const TH = 28;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > TH) {
      moveLane(dx < 0 ? -1 : 1);
      return;
    }
    if (Math.abs(dy) > TH) {
      if (dy < 0) turnLeft();
      else turnRight();
      return;
    }

    // короткий тап: слева/справа от машины — соседняя полоса
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const tapX = t.clientX - rect.left;
    const carX = laneXAnimRef.current; // центр
    if (tapX < carX) moveLane(-1);
    else moveLane(1);
  };

  /* ===== Tilt ===== */
  useEffect(() => {
    if (!tiltEnabled) return;
    let handler: any;
    const attach = () => {
      handler = (e: DeviceOrientationEvent) => {
        if (!e.gamma && e.gamma !== 0) return;
        const g = (e.gamma || 0) * tiltSensitivity;
        if (g < -15) moveLane(-1);
        else if (g > 15) moveLane(1);
      };
      window.addEventListener("deviceorientation", handler, true);
    };
    const anyWindow = window as any;
    if (typeof anyWindow.DeviceOrientationEvent?.requestPermission === "function") {
      anyWindow.DeviceOrientationEvent.requestPermission?.().then(
        (p: string) => p === "granted" && attach(),
      );
    } else attach();
    return () => window.removeEventListener("deviceorientation", handler, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiltEnabled, tiltSensitivity]);

  /* ===== Гараж: предпросмотр ===== */
  useEffect(() => {
    drawGaragePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carColor]);
  function drawGaragePreview() {
    const c = garageCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = (c.width = 360);
    const h = (c.height = 220);
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#0b1020");
    g.addColorStop(1, "#141a2e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // платформа
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(40, h - 40, w - 80, 8);

    // машина
    const draw = (x: number, y: number) => {
      const car = { w: 70, h: 120 };
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.1);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#000";
      roundRect(ctx, -car.w / 2, -car.h / 2 + 6, car.w, car.h, 16);
      ctx.fill();
      ctx.globalAlpha = 1;
      const grad = ctx.createLinearGradient(-car.w / 2, -car.h / 2, car.w / 2, car.h / 2);
      grad.addColorStop(0, lighten(carColor, 0.1));
      grad.addColorStop(1, darken(carColor, 0.12));
      ctx.fillStyle = grad;
      roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 16);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      roundRect(ctx, -car.w / 2 + 10, -car.h / 2 + 14, car.w - 20, car.h - 28, 12);
      ctx.fill();
      ctx.restore();

      function roundRect(
        ctx2: CanvasRenderingContext2D,
        x2: number,
        y2: number,
        w2: number,
        h2: number,
        r: number,
      ) {
        const rr = Math.min(r, w2 / 2, h2 / 2);
        ctx2.beginPath();
        ctx2.moveTo(x2 + rr, y2);
        ctx2.arcTo(x2 + w2, y2, x2 + w2, y2 + h2, rr);
        ctx2.arcTo(x2 + w2, y2 + h2, x2, y2 + h2, rr);
        ctx2.arcTo(x2, y2 + h2, x2, y2, rr);
        ctx2.arcTo(x2, y2, x2 + w2, y2, rr);
        ctx2.closePath();
      }
    };
    draw(w / 2, h / 2 - 10);

    function roundRect(
      ctx2: CanvasRenderingContext2D,
      x2: number,
      y2: number,
      w2: number,
      h2: number,
      r: number,
    ) {
      const rr = Math.min(r, w2 / 2, h2 / 2);
      ctx2.beginPath();
      ctx2.moveTo(x2 + rr, y2);
      ctx2.arcTo(x2 + w2, y2, x2 + w2, y2 + h2, rr);
      ctx2.arcTo(x2 + w2, y2 + h2, x2, y2 + h2, rr);
      ctx2.arcTo(x2, y2 + h2, x2, y2, rr);
      ctx2.arcTo(x2, y2, x2 + w2, y2, rr);
      ctx2.closePath();
    }
  }

  /* ===== Лидеры ===== */
  useEffect(() => {
    if (screen !== "leaders") return;
    (async () => {
      try {
        const r = await fetch("/api/runner/leaderboard").then((r) => r.json());
        if (r?.ok && Array.isArray(r.items)) setLeaders(r.items);
      } catch {}
    })();
  }, [screen]);

  /* ===== UI ===== */
  const landscape = typeof window !== "undefined" && window.innerWidth > window.innerHeight;

  const Controls = (
    <div className="controls">
      <button className="btn" onClick={() => moveLane(-1)} aria-label="Левее">
        ⬅️
      </button>
      <button className="btn" onClick={() => moveLane(1)} aria-label="Правее">
        ➡️
      </button>
      <button className="btn" onClick={turnLeft} aria-label="Поворот влево">
        ↩️
      </button>
      <button className="btn" onClick={turnRight} aria-label="Поворот вправо">
        ↪️
      </button>
      <button className="btn" onClick={uTurn} aria-label="Разворот">
        🔄
      </button>
      <button
        className="btn"
        onClick={() => {
          ensureAudio();
          setScreen(screen === "game" ? "paused" : "game");
        }}
        aria-label="Пауза"
      >
        {screen === "game" ? "⏸️" : "▶️"}
      </button>
    </div>
  );

  // на клиенте
const share = async () => {
  const tg = (window as any)?.Telegram?.WebApp;
  if (!tg?.initData) {
    tg?.showAlert?.('Открой игру из бота, а не по прямой ссылке');
    return;
  }

  const href = window.location.origin + '/game';
  const text = `Мой счёт в City Runner: ${score}! Попробуешь обогнать?`;

  const r = await fetch('/api/tg/prepared', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // 1) как заголовок
      'x-telegram-init-data': tg.initData,
    },
    body: JSON.stringify({
      text,
      url: href,
      button_text: 'Играть',
      peer_types: ['users','groups','channels'],
      // 2) дублируем в body (на случай, если заголовок срежут)
      initData: tg.initData,
    }),
  });

  const data = await r.json();
  if (!data.ok) throw new Error(data.error || 'prepare failed');
  tg?.shareMessage?.(data.id);
};


  return (
    <div className="game-root">
      {landscape && (
        <div className="rotate-overlay">
          <div className="rotate-card">📱 Поверните устройство в портрет</div>
        </div>
      )}

      <div className="hud">
        <div className="pill">🏁 {score}</div>
        <div className="pill">🚀 {Math.round(speedRef.current)} km/h</div>
        <div className="pill">⭐ {best}</div>
        <div
          className="pill env"
          onClick={() => {
            const next: Env = env === "day" ? "night" : env === "night" ? "rain" : "day";
            setEnv(next);
            saveProfile({ env: next });
          }}
        >
          🌈 {env}
        </div>
      </div>

      <div className="canvas-wrap" onTouchStart={onTouchStartCanvas} onTouchEnd={onTouchEndCanvas}>
        <canvas ref={canvasRef} className="game-canvas" aria-label="Driving game canvas" />
      </div>

      {screen === "game" && Controls}

      {/* Меню */}
      {screen === "menu" && (
        <div className="overlay">
          <div className="card bright">
            <h1>City Runner</h1>
            <p>Перестраивайся, увёртывайся, комбо за риск — и в лидеры!</p>

            {/* Миссии + Daily */}
            <div className="mission">
              <div className="mrow">
                <span>Дистанция</span>
                <b>{Math.floor(missions.distance)} м</b>
              </div>
              <div className="bar">
                <i style={{ width: `${Math.min(100, (missions.distance / 1000) * 100)}%` }} />
              </div>
              <div className="mgrid">
                <div>
                  Перестроения: <b>{missions.laneChanges}</b>
                </div>
                <div>
                  Near-miss: <b>{missions.nearMiss}</b>
                </div>
                <div>
                  Комбо: <b>{missions.combosBest}×</b>
                </div>
                <div>
                  Развороты: <b>{missions.uturns}</b>
                </div>
              </div>
            </div>

            <div className="daily">
              <h3>Daily-квесты</h3>
              {daily.map((q) => (
                <div key={q.id} className={`q ${q.done ? "done" : ""}`}>
                  <div className="qhead">
                    <span>{q.title}</span>
                    <b>
                      {q.progress}/{q.goal}
                    </b>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${Math.min(100, (q.progress / q.goal) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid">
              <button
                className="primary"
                onClick={() => {
                  ensureAudio();
                  setScreen("game");
                }}
              >
                ▶️ Играть
              </button>
              <button onClick={() => setScreen("garage")}>🎨 Гараж</button>
              <button onClick={() => setScreen("settings")}>⚙️ Настройки</button>
              <button onClick={() => setScreen("help")}>❓ Помощь</button>
              <button onClick={() => setScreen("leaders")}>🏆 Лидеры</button>
            </div>
          </div>
        </div>
      )}

      {/* Пауза */}
      {screen === "paused" && (
        <div className="overlay">
          <div className="card">
            <h2>Пауза</h2>
            <div className="grid">
              <button className="primary" onClick={() => setScreen("game")}>
                ▶️ Продолжить
              </button>
              <button onClick={() => setScreen("menu")}>🏠 В меню</button>
              <button onClick={share}>📤 Поделиться</button>
            </div>
          </div>
        </div>
      )}

      {/* Гараж */}
      {screen === "garage" && (
        <div className="overlay">
          <div className="card bright">
            <h2>🎨 Гараж</h2>
            <canvas ref={garageCanvasRef} className="garage-canvas" />
            <div className="swatches">
              {colourOptions.map((c) => (
                <button
                  key={c}
                  className="swatch"
                  style={{
                    background: `linear-gradient(180deg, ${lighten(c, 0.14)}, ${darken(c, 0.1)})`,
                    outline: c === carColor ? "3px solid #fff" : "none",
                  }}
                  onClick={() => {
                    setCarColor(c);
                    saveProfile({ carColor: c });
                    drawGaragePreview();
                  }}
                  aria-label={`Цвет ${c}`}
                />
              ))}
            </div>
            <div className="grid">
              <button onClick={() => setScreen("menu")}>⬅️ Назад</button>
              <button
                className="primary"
                onClick={() => {
                  ensureAudio();
                  setScreen("game");
                }}
              >
                ▶️ Играть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Настройки */}
      {screen === "settings" && (
        <div className="overlay">
          <div className="card">
            <h2>⚙️ Настройки</h2>
            <div className="setting">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={tiltEnabled}
                  onChange={(e) => setTiltEnabled(e.target.checked)}
                />
                <span>Наклон для перестроений</span>
              </label>
            </div>
            <div className="setting">
              <label>Чувствительность наклона</label>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={tiltSensitivity}
                onChange={(e) => setTiltSensitivity(Number(e.target.value))}
              />
            </div>
            <div className="setting">
              <label>Окружение</label>
              <div className="grid">
                <button
                  onClick={() => {
                    setEnv("day");
                    saveProfile({ env: "day" });
                  }}
                >
                  🌤️ День
                </button>
                <button
                  onClick={() => {
                    setEnv("night");
                    saveProfile({ env: "night" });
                  }}
                >
                  🌙 Ночь
                </button>
                <button
                  onClick={() => {
                    setEnv("rain");
                    saveProfile({ env: "rain" });
                  }}
                >
                  🌧️ Дождь
                </button>
              </div>
            </div>
            <div className="grid">
              <button onClick={() => setScreen("menu")}>⬅️ Назад</button>
              <button
                className="primary"
                onClick={() => {
                  ensureAudio();
                  setScreen("game");
                }}
              >
                ▶️ Играть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Помощь */}
      {screen === "help" && (
        <div className="overlay">
          <div className="card">
            <h2>❓ Как играть</h2>
            <ul className="help">
              <li>Тап слева/справа от машины — перестроение в соседнюю полосу.</li>
              <li>Свайпы влево/вправо — перестроение, вверх/вниз — поворот; двойной тап — разворот.</li>
              <li>Near-miss (опасный манёвр близко к бамперу) даёт бонусы и комбо.</li>
            </ul>
            <div className="grid">
              <button className="primary" onClick={() => setScreen("menu")}>
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Лидеры */}
      {screen === "leaders" && (
        <div className="overlay">
          <div className="card">
            <h2>🏆 Лидеры</h2>
            <div style={{ maxHeight: "50vh", overflow: "auto", margin: "8px 0" }}>
              {leaders.map((l, i) => (
                <div
                  key={l.uid}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 6px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span>
                    {i + 1}. {l.name || `id${l.uid}`}
                  </span>
                  <b>{l.score}</b>
                </div>
              ))}
              {leaders.length === 0 && <div style={{ padding: 8, opacity: 0.7 }}>Пока пусто</div>}
            </div>
            <div className="grid">
              <button onClick={() => setScreen("menu")}>⬅️ Назад</button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {screen === "gameover" && (
        <div className="overlay">
          <div className="card">
            <h2>💥 Столкновение</h2>
            <p>
              Счёт: <b>{score}</b>
            </p>
            <p>
              Рекорд: <b>{best}</b>
            </p>
            <div className="grid">
              <button
                className="primary"
                onClick={() => {
                  ensureAudio();
                  setScreen("game");
                }}
              >
                🔁 Ещё раз
              </button>
              <button onClick={() => setScreen("menu")}>🏠 Меню</button>
              <button onClick={share}>📤 Поделиться</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
