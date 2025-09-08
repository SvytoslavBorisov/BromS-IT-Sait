"use client";

import { useEffect, useRef, useState } from "react";
import "./mini.css"; // локальные стили только для этой страницы

export default function GamePage() {
  // ====== Состояния/ссылки (из твоего index.js) ======
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const carLaneRef = useRef(1);
  const carColorRef = useRef("#ff3b30");
  const orientationRef = useRef(0);
  const speedRef = useRef(4);

  const [carLane, setCarLane] = useState(1);
  const [carColor, setCarColor] = useState("#ff3b30");
  const [orientation, setOrientation] = useState(0);
  const [showColours, setShowColours] = useState(false);

  useEffect(() => { carLaneRef.current = carLane; }, [carLane]);
  useEffect(() => { carColorRef.current = carColor; }, [carColor]);
  useEffect(() => { orientationRef.current = orientation; }, [orientation]);

  // ====== Инициализация Telegram WebApp (ready + тема) ======
  useEffect(() => {
    // guard SSR
    const tg = (globalThis as any)?.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      const params = tg.themeParams || {};
      const root = document.documentElement;
      Object.entries(params).forEach(([k, v]) => {
        root.style.setProperty(`--tg-${k}`, String(v));
      });
      root.style.setProperty("--button-bg", (params.button_color as string) || "#007bff");
      root.style.setProperty("--button-fg", (params.button_text_color as string) || "#ffffff");
      root.style.setProperty(
        "--button-bg-active",
        params.button_color ? darken(String(params.button_color), 0.2) : "#0056b3"
      );
    }
  }, []);

  function darken(colour: string, amount: number) {
    if (!/^#([A-Fa-f0-9]{6})$/.test(colour)) return colour;
    const r = parseInt(colour.slice(1, 3), 16);
    const g = parseInt(colour.slice(3, 5), 16);
    const b = parseInt(colour.slice(5, 7), 16);
    const nr = Math.max(0, Math.min(255, Math.floor(r * (1 - amount))));
    const ng = Math.max(0, Math.min(255, Math.floor(g * (1 - amount))));
    const nb = Math.max(0, Math.min(255, Math.floor(b * (1 - amount))));
    return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
  }

  // ====== Рендеринг канвы (адаптация из index.js) ======
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const width = canvas.width;
    const height = canvas.height;

    const carWidth = 40;
    const carHeight = 70;

    const laneCount = 3;
    const lanePositions = new Array(laneCount).fill(0).map((_, i) => {
      return (width / laneCount) * i + (width / laneCount - carWidth) / 2;
    });

    const lineSpacing = 80;
    const lineCount = Math.ceil(height / lineSpacing) + 1;
    let linePositions: number[] = [];
    for (let i = 0; i < lineCount; i++) linePositions.push(i * lineSpacing);

    let frameId = 0;
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // дорога
      ctx.fillStyle = "#3b3b3b";
      ctx.fillRect(0, 0, width, height);

      // пунктирные разделители полос
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 20]);
      for (let i = 1; i < laneCount; i++) {
        const x = (width / laneCount) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // бегущие метки по центру (движение дороги)
      for (let i = 0; i < linePositions.length; i++) {
        linePositions[i] += speedRef.current;
        if (linePositions[i] > height) linePositions[i] -= lineCount * lineSpacing;

        const lineY = linePositions[i];
        ctx.fillStyle = "#ffffff";
        const laneCentre = width / laneCount / 2;
        ctx.fillRect(laneCentre - 2, lineY, 4, 30);
      }

      // машина
      const laneIndex = carLaneRef.current;
      const cx = lanePositions[laneIndex] + carWidth / 2;
      const cy = height - carHeight / 2 - 20;

      ctx.save();
      ctx.translate(cx, cy);
      const angle = (orientationRef.current * Math.PI) / 180;
      ctx.rotate(angle);

      ctx.fillStyle = carColorRef.current;
      ctx.fillRect(-carWidth / 2, -carHeight / 2, carWidth, carHeight);

      ctx.fillStyle = "#ffffcc";
      if (orientationRef.current === 0) {
        ctx.fillRect(-carWidth / 4, -carHeight / 2, carWidth / 2, 5);
      } else if (Math.abs(orientationRef.current) === 90) {
        ctx.fillRect(carWidth / 2 - 5, -carHeight / 4, 5, carHeight / 2);
      } else if (Math.abs(orientationRef.current) === 180) {
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(-carWidth / 4, carHeight / 2 - 5, carWidth / 2, 5);
      }
      ctx.restore();

      frameId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(frameId);
  }, []);

  // ====== Управление (из твоего index.js) ======
  const moveLeft = () => setCarLane((p) => Math.max(0, p - 1));
  const moveRight = () => setCarLane((p) => Math.min(2, p + 1));
  const uTurn = () => setOrientation((p) => (Math.abs(p) === 180 ? 0 : 180));
  const turnLeft = () => {
    const opts = [0, 90, 180, -90] as const;
    setOrientation((p) => opts[(opts.indexOf(p as any) - 1 + opts.length) % opts.length]);
  };
  const turnRight = () => {
    const opts = [0, 90, 180, -90] as const;
    setOrientation((p) => opts[(opts.indexOf(p as any) + 1) % opts.length]);
  };
  const toggleColours = () => setShowColours((s) => !s);
  const selectColour = (c: string) => { setCarColor(c); setShowColours(false); };

  const colourOptions = ["#ff3b30", "#007aff", "#34c759", "#ffa600", "#8e8e93"];

  return (
    <div className="game-container">
      <canvas ref={canvasRef} width={450} height={600} aria-label="Driving game canvas" />
      <div className="controls">
        <button onClick={moveLeft} aria-label="Move left">⬅️ Полоса</button>
        <button onClick={moveRight} aria-label="Move right">➡️ Полоса</button>
        <button onClick={turnLeft} aria-label="Turn left">↩️ Поворот</button>
        <button onClick={turnRight} aria-label="Turn right">↪️ Поворот</button>
        <button onClick={uTurn} aria-label="U-turn">🔄 Разворот</button>
        <button onClick={toggleColours} aria-label="Customise colour">🎨 Цвет</button>
      </div>
      {showColours && (
        <div className="color-picker">
          {colourOptions.map((c) => (
            <div
              key={c}
              className="color-swatch"
              style={{ backgroundColor: c, borderColor: c === carColor ? "#000" : "#ddd" }}
              onClick={() => selectColour(c)}
              role="button"
              aria-label={`Select colour ${c}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
