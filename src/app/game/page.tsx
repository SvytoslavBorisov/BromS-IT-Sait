"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./mini.css";

/* ======= ВСПОМОГАТЕЛЬНЫЕ ТИПЫ ======= */
type Screen = "menu" | "game" | "paused" | "garage" | "settings" | "help" | "gameover";
type Obstacle = { lane: number; y: number; w: number; h: number; color: string; speedMul: number };

export default function GamePage() {
  /* ======= ССЫЛКИ NA CANVAS И СОСТОЯНИЯ ======= */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // гейм-состояния (UI)
  const [screen, setScreen] = useState<Screen>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  // пользовательские настройки
  const [carColor, setCarColor] = useState("#ff3b30");
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [tiltSensitivity, setTiltSensitivity] = useState(0.8); // 0.5..1.5

  // внутриигровые состояния (для рисования)
  const speedRef = useRef(320); // px/сек по «дороге»
  const laneTargetRef = useRef(1); // 0..2
  const laneXAnimRef = useRef(0); // плавный x (в px)
  const orientTargetRef = useRef(0); // 0 / 90 / -90 / 180
  const orientAnimRef = useRef(0); // фактический угол (град)
  const obstaclesRef = useRef<Obstacle[]>([]);
  const gameRunningRef = useRef(false);
  const lastTsRef = useRef<number>(0);
  const dprRef = useRef(1);
  const lanePositionsRef = useRef<number[]>([0, 0, 0]); // высчитывается по resize

  // служебные
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const doubleTapRef = useRef<number>(0);

  // цвета «гаража»
  const colourOptions = useMemo(
    () => ["#ff3b30", "#007aff", "#34c759", "#ffa600", "#8e8e93", "#bf5af2", "#0fb9b1"],
    []
  );

  /* ======= ТЕЛЕГРАМ ТЕМА / HAPTICS ======= */
  const tg = (globalThis as any)?.Telegram?.WebApp;
  const haptic = (type: "soft" | "light" | "medium" | "heavy" | "rigid" = "light") =>
    tg?.HapticFeedback?.impactOccurred?.(type);

  useEffect(() => {
    if (!tg) return;
    tg.ready();
    const p = tg.themeParams || {};
    const root = document.documentElement;
    Object.entries(p).forEach(([k, v]) => root.style.setProperty(`--tg-${k}`, String(v)));
    root.style.setProperty("--button-bg", (p.button_color as string) || "#111827");
    root.style.setProperty("--button-fg", (p.button_text_color as string) || "#ffffff");
    root.style.setProperty("--canvas-bg", (p.secondary_bg_color as string) || "#1f2937");
  }, [tg]);

  /* ======= RESIZE/DPR И ОРИЕНТАЦИЯ ======= */
  function resizeCanvas() {
    const canvas = canvasRef.current!;
    const cssW = Math.min(window.innerWidth, 520);
    const cssH = Math.min(Math.floor(window.innerHeight * 0.78), 820);
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    dprRef.current = dpr;

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);

    const laneCount = 3;
    const carW = 44;
    const laneW = cssW / laneCount;
    lanePositionsRef.current = new Array(laneCount)
      .fill(0)
      .map((_, i) => i * laneW + (laneW - carW) / 2);

    // при ресайзе поправим плавный X
    laneXAnimRef.current = lanePositionsRef.current[laneTargetRef.current];
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

  /* ======= ОСНОВНОЙ РЕНДЕР/ГЕЙМЛУП ======= */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    // бегущая разметка
    const line = { y: 0, spacing: 90, len: 36 };

    const car = { w: 44, h: 76 };

    const resetGame = () => {
      obstaclesRef.current = [];
      setScore(0);
      speedRef.current = 300;
      laneTargetRef.current = 1;
      orientTargetRef.current = 0;
      orientAnimRef.current = 0;
      laneXAnimRef.current = lanePositionsRef.current[1];
      lastTsRef.current = performance.now();
    };

    const spawnObstacle = (w: number, h: number) => {
      const lane = Math.floor(Math.random() * 3);
      const color = ["#374151", "#1f2937", "#111827"][Math.floor(Math.random() * 3)];
      const speedMul = 0.6 + Math.random() * 0.8; // некоторые едут ближе/быстрее
      obstaclesRef.current.push({ lane, y: -h - 40, w, h, color, speedMul });
    };

    let spawnAcc = 0;

    const ease = (from: number, to: number, k = 0.18) => from + (to - from) * k;

    const drawCar = (x: number, y: number) => {
      const angle = (orientAnimRef.current * Math.PI) / 180;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // тень
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#000";
      roundRect(ctx, -car.w / 2, -car.h / 2 + 4, car.w, car.h, 10);
      ctx.fill();
      ctx.globalAlpha = 1;

      // корпус
      ctx.fillStyle = carColor;
      roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 10);
      ctx.fill();

      // стекло
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      roundRect(ctx, -car.w / 2 + 6, -car.h / 2 + 10, car.w - 12, car.h - 20, 8);
      ctx.fill();

      // фары/стопы в зависимости от ориентации
      ctx.fillStyle = Math.abs(orientTargetRef.current) === 180 ? "#ff5a5f" : "#ffd166";
      ctx.fillRect(-car.w / 4, -car.h / 2 - 2, car.w / 2, 5);

      ctx.restore();
    };

    function loop(ts: number) {
      const dpr = dprRef.current;
      const cssW = Math.floor(canvas!.width / dpr);
      const cssH = Math.floor(canvas!.height / dpr);

      const dt = Math.min(0.033, (ts - (lastTsRef.current || ts)) / 1000);
      lastTsRef.current = ts;

      // фон/дорога с параллаксом
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      // градиент дороги
      const g = ctx.createLinearGradient(0, 0, 0, cssH);
      g.addColorStop(0, "#262b36");
      g.addColorStop(1, "#1a1e27");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cssW, cssH);

      // обочины
      ctx.fillStyle = "#0b0e13";
      ctx.fillRect(-8, 0, 8, cssH);
      ctx.fillRect(cssW, 0, 8, cssH);

      // центральная «бегущая» метка
      line.y += speedRef.current * dt * 0.9;
      line.y %= line.spacing;
      ctx.fillStyle = "#e5e7eb";
      for (let y = -line.len; y < cssH + line.len; y += line.spacing) {
        ctx.fillRect(cssW / 2 - 2, y + line.y, 4, line.len);
      }

      // полосы (разделители)
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 2;
      for (let i = 1; i < 3; i++) {
        const x = (cssW / 3) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cssH);
        ctx.stroke();
      }

      // плавный lane X
      const targetX = lanePositionsRef.current[laneTargetRef.current] + car.w / 2;
      laneXAnimRef.current = ease(laneXAnimRef.current, targetX, 0.2);

      // плавный ориент
      orientAnimRef.current = ease(orientAnimRef.current, orientTargetRef.current, 0.18);

      // автомобиль (у нижнего края)
      const carX = laneXAnimRef.current;
      const carY = cssH - car.h / 2 - 24;
      drawCar(carX, carY);

      // препятствия
      spawnAcc += dt;
      const spawnEvery = Math.max(0.55, 1.6 - score * 0.0015); // чаще со временем
      if (spawnAcc >= spawnEvery) {
        spawnAcc = 0;
        // разные размеры машин
        const ow = [40, 48, 56][Math.floor(Math.random() * 3)];
        const oh = [60, 72, 84][Math.floor(Math.random() * 3)];
        spawnObstacle(ow, oh);
      }

      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const o = obstaclesRef.current[i];
        const laneX = lanePositionsRef.current[o.lane] + o.w / 2;

        o.y += speedRef.current * o.speedMul * dt;

        // тень
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "#000";
        roundRect(ctx, laneX - o.w / 2, o.y - o.h / 2 + 5, o.w, o.h, 9);
        ctx.fill();
        ctx.globalAlpha = 1;

        // корпус
        ctx.fillStyle = o.color;
        roundRect(ctx, laneX - o.w / 2, o.y - o.h / 2, o.w, o.h, 9);
        ctx.fill();

        if (o.y - o.h / 2 > cssH + 10) {
          obstaclesRef.current.splice(i, 1);
          setScore((s) => s + 10);
        }
      }

      // столкновения (AABB по мировым coords, визуальный поворот игнорим)
      const my = { x: carX - car.w / 2, y: carY - car.h / 2, w: car.w, h: car.h };
      for (const o of obstaclesRef.current) {
        const ox = lanePositionsRef.current[o.lane];
        const ob = { x: ox, y: o.y - o.h / 2, w: o.w, h: o.h };
        if (rectsIntersect(my, ob)) {
          gameOver();
          return;
        }
      }

      // очки/скорость
      setScore((s) => s + Math.floor(speedRef.current * dt * 0.15));
      speedRef.current = Math.min(680, speedRef.current + dt * 4.0);

      if (gameRunningRef.current) raf = requestAnimationFrame(loop);
    }

    const gameOver = () => {
      haptic("heavy");
      gameRunningRef.current = false;
      cancelAnimationFrame(raf);
      // рекорд
      setBest((prev) => {
        const v = Math.max(prev, score);
        localStorage.setItem("runner_best", String(v));
        return v;
      });
      setScreen("gameover");
    };

    // загрузим лучший
    const bestSaved = Number(localStorage.getItem("runner_best") || "0");
    if (bestSaved > 0) setBest(bestSaved);

    // запуск
    if (screen === "game") {
      resetGame();
      gameRunningRef.current = true;
      raf = requestAnimationFrame(loop);
    } else {
      gameRunningRef.current = false;
      cancelAnimationFrame(raf);
    }

    return () => cancelAnimationFrame(raf);
  }, [screen, carColor]); // при смене экрана/цвета перезапустим луп

  /* ======= ЖЕСТЫ/ТАЧ/КНОПКИ ======= */
  const moveLane = (dir: -1 | 1) => {
    const next = Math.max(0, Math.min(2, laneTargetRef.current + dir));
    if (next !== laneTargetRef.current) {
      laneTargetRef.current = next;
      haptic("light");
    }
  };
  const turnLeft = () => {
    const seq = [0, 90, 180, -90] as const;
    const i = seq.indexOf(orientTargetRef.current as any);
    orientTargetRef.current = seq[(i - 1 + seq.length) % seq.length];
    haptic("soft");
  };
  const turnRight = () => {
    const seq = [0, 90, 180, -90] as const;
    const i = seq.indexOf(orientTargetRef.current as any);
    orientTargetRef.current = seq[(i + 1) % seq.length];
    haptic("soft");
  };
  const uTurn = () => {
    orientTargetRef.current = Math.abs(orientTargetRef.current) === 180 ? 0 : 180;
    haptic("medium");
  };

  const onTouchStart: React.TouchEventHandler = (e) => {
    const t = e.changedTouches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: performance.now() };
  };
  const onTouchEnd: React.TouchEventHandler = (e) => {
    const s = touchStartRef.current;
    touchStartRef.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    const dt = performance.now() - s.t;

    // двойной тап
    const now = performance.now();
    if (now - doubleTapRef.current < 260) {
      doubleTapRef.current = 0;
      uTurn();
      return;
    }
    doubleTapRef.current = now;

    // свайпы
    const TH = 28; // пороги в px
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > TH) {
      moveLane(dx < 0 ? -1 : 1);
    } else if (Math.abs(dy) > TH) {
      if (dy < 0) turnLeft();
      else turnRight();
    } else if (dt < 160) {
      // короткий тап — пауза/резюм
      if (screen === "game") setScreen("paused");
      else if (screen === "paused") setScreen("game");
    }
  };

  /* ======= ТИЛТ/АКСЕЛЕРОМЕТР ======= */
  useEffect(() => {
    if (!tiltEnabled) return;
    let handler: any;
    const attach = () => {
      handler = (e: DeviceOrientationEvent) => {
        if (!e.gamma && e.gamma !== 0) return;
        const g = (e.gamma || 0) * tiltSensitivity; // -90..90
        if (g < -15) moveLane(-1);
        else if (g > 15) moveLane(1);
      };
      window.addEventListener("deviceorientation", handler, true);
    };
    // iOS permission
    const anyWindow = window as any;
    if (typeof anyWindow.DeviceOrientationEvent?.requestPermission === "function") {
      anyWindow.DeviceOrientationEvent.requestPermission?.().then((p: string) => {
        if (p === "granted") attach();
      });
    } else {
      attach();
    }
    return () => window.removeEventListener("deviceorientation", handler, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiltEnabled, tiltSensitivity]);

  /* ======= ХЭЛПЕРЫ ======= */
  function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function rectsIntersect(a: { x: number; y: number; w: number; h: number }, b: typeof a) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* ======= ЭКРАННЫЕ КНОПКИ ======= */
  const Controls = (
    <div className="controls" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <button className="btn" onClick={() => moveLane(-1)} aria-label="Левее">⬅️</button>
      <button className="btn" onClick={() => moveLane(1)} aria-label="Правее">➡️</button>
      <button className="btn" onClick={turnLeft} aria-label="Поворот влево">↩️</button>
      <button className="btn" onClick={turnRight} aria-label="Поворот вправо">↪️</button>
      <button className="btn" onClick={uTurn} aria-label="Разворот">🔄</button>
      <button className="btn" onClick={() => setScreen(screen === "game" ? "paused" : "game")} aria-label="Пауза">
        {screen === "game" ? "⏸️" : "▶️"}
      </button>
    </div>
  );

  /* ======= ПОРТРЕТ/ЛАНДШАФТ ======= */
  const landscape = typeof window !== "undefined" && window.innerWidth > window.innerHeight;

  /* ======= UI ======= */
  return (
    <div className="game-root">
      {/* Оверлей «поверните экран» */}
      {landscape && (
        <div className="rotate-overlay">
          <div className="rotate-card">
            📱 Поверните устройство в портретный режим
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="hud">
        <div className="pill">🏁 {score}</div>
        <div className="pill">🚀 {Math.round(speedRef.current)} km/h</div>
        <div className="pill">⭐ {best}</div>
      </div>

      {/* Канва */}
      <div className="canvas-wrap">
        <canvas ref={canvasRef} className="game-canvas" aria-label="Driving game canvas" />
      </div>

      {/* Кнопки */}
      {screen === "game" && Controls}

      {/* Главный экран */}
      {screen === "menu" && (
        <div className="overlay">
          <div className="card">
            <h1>City Runner</h1>
            <p>Перестраивайся, увёртывайся, проходи дальше.</p>
            <div className="grid">
              <button className="primary" onClick={() => setScreen("game")}>▶️ Играть</button>
              <button onClick={() => setScreen("garage")}>🎨 Гараж</button>
              <button onClick={() => setScreen("settings")}>⚙️ Настройки</button>
              <button onClick={() => setScreen("help")}>❓ Помощь</button>
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
              <button className="primary" onClick={() => setScreen("game")}>▶️ Продолжить</button>
              <button onClick={() => setScreen("menu")}>🏠 В меню</button>
            </div>
          </div>
        </div>
      )}

      {/* Гараж */}
      {screen === "garage" && (
        <div className="overlay">
          <div className="card">
            <h2>🎨 Гараж</h2>
            <div className="swatches">
              {colourOptions.map((c) => (
                <button
                  key={c}
                  className="swatch"
                  style={{ backgroundColor: c, outline: c === carColor ? "3px solid #fff" : "none" }}
                  onClick={() => setCarColor(c)}
                  aria-label={`Цвет ${c}`}
                />
              ))}
            </div>
            <div className="grid">
              <button className="primary" onClick={() => setScreen("menu")}>Готово</button>
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
            <div className="grid">
              <button onClick={() => setScreen("menu")}>⬅️ Назад</button>
              <button className="primary" onClick={() => setScreen("game")}>▶️ Играть</button>
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
              <li>Свайп влево/вправо — перестроение между 3 полосами.</li>
              <li>Свайп вверх — поворот влево, вниз — вправо, двойной тап — разворот.</li>
              <li>Кнопки снизу — дубль действий (на случай неидеальных свайпов).</li>
              <li>Короткий тап по экрану — пауза/продолжить.</li>
            </ul>
            <div className="grid">
              <button className="primary" onClick={() => setScreen("menu")}>Понятно</button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {screen === "gameover" && (
        <div className="overlay">
          <div className="card">
            <h2>💥 Столкновение</h2>
            <p>Счёт: <b>{score}</b></p>
            <p>Рекорд: <b>{best}</b></p>
            <div className="grid">
              <button className="primary" onClick={() => setScreen("game")}>🔁 Ещё раз</button>
              <button onClick={() => setScreen("menu")}>🏠 Меню</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
