"use client";
import { useMemo, useEffect, useRef } from "react";
import { useGameStore } from "@/components/games/TowerDefense/store";
import { TOWER_COST, WAVES } from "@/components/games/TowerDefense/config";

export function GameHUD() {
  const gold = useGameStore(s => s.gold);
  const lives = useGameStore(s => s.lives);
  const paused = useGameStore(s => s.paused);
  const wave = useGameStore(s => s.wave);
  const togglePause = useGameStore(s => s.togglePause);
    const waveStart = useGameStore(s => s.waveStart);
    const setCenter = useGameStore(s => s.setCenter);

    // ✅ вызываем только в эффекте/хэндлере
    useEffect(() => { setCenter({ x: screen.width/2, y: screen.height/2 }); }, [screen, setCenter]);

  const maxWaveIndex = WAVES.length - 1;
  const canStart = !wave.isActive && wave.current <= maxWaveIndex;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: 10, left: 12,
        zIndex: 20,                  // <-- ВАЖНО
        color: "#e6f0ff",
        fontFamily: "ui-sans-serif, system-ui",
        userSelect: "none",
        pointerEvents: "auto",       // явное
      }}
    >
      <div style={{ fontWeight: 700, letterSpacing: 0.5 }}>🧪 Crypto Tower Defense</div>
      <div style={{ marginTop: 6, fontSize: 14, opacity: 0.9 }}>
        💖 Жизни: <strong>{lives}</strong> &nbsp;|&nbsp; 🪙 Золото: <strong>{gold}</strong> &nbsp;|&nbsp; 🏗️ Башня: {TOWER_COST}
      </div>
      <div style={{ marginTop: 4, fontSize: 13, opacity: 0.9 }}>
        🌊 Волна: <strong>{Math.min(wave.current + 1, WAVES.length)}</strong>/{WAVES.length}
        &nbsp; {wave.isActive ? "— идёт" : "— ожидание"}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button
          onClick={togglePause}
          style={{ padding: "6px 10px", borderRadius: 8, background: paused ? "#ef4444" : "#334155", color: "white", border: "1px solid rgba(255,255,255,.2)" }}
        >
          {paused ? "▶️ Продолжить" : "⏸ Пауза"}
        </button>
        <button
          onClick={waveStart}
          disabled={!canStart}
          style={{ padding: "6px 10px", borderRadius: 8, background: canStart ? "#22c55e" : "#475569", color: "white", border: "1px solid rgba(255,255,255,.2)" }}
        >
          🚀 Старт волны
        </button>
      </div>
    </div>
  );
}
