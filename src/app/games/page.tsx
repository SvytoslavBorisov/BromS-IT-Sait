"use client";
import { useMemo, useEffect } from "react";
import { useScreenSize } from "@/components/games/TowerDefense/hooks/useScreenSize";
import { useGameStore } from "@/components/games/TowerDefense/store";
import { useWaveSpawner } from "@/components/games/TowerDefense/hooks/useWaveSpawner";
import { useGameLoop } from "@/components/games/TowerDefense/hooks/useGameLoop";
import { BASE_RADIUS, BULLET_RADIUS, ENEMY_RADIUS, TOWER_COST } from "@/components/games/TowerDefense/config";
import { GameHUD } from "@/components/games/TowerDefense/GameHUD";
import { ShopPanel } from "@/components/games/TowerDefense/ShopPanel";
import { useWaveAutoStart } from "@/components/games/TowerDefense/hooks/useWaveAutoStart";

export default function Page() {
  const screen = useScreenSize();

  const setCenter = useGameStore(s => s.setCenter);
  const enemies = useGameStore(s => s.enemies);
  const towers = useGameStore(s => s.towers);
  const bullets = useGameStore(s => s.bullets);
  const selectTower = useGameStore(s => s.selectTower);
  const placeTower = useGameStore(s => s.placeTower);
  const towerRange = useGameStore(s => s.towerRange);
  const selectedId = useGameStore(s => s.selectedTowerId);

  const center = useMemo(() => ({ x: screen.width / 2, y: screen.height / 2 }), [screen]);

  // ✅ корректно: обновляем стор ТОЛЬКО в эффекте, не в рендере
  useEffect(() => {
    setCenter(center);
  }, [center, setCenter]);

  // ❌ УДАЛИТЬ: это и вызывает "Cannot update a component while rendering"
  // setCenter(center);

  // запуск систем (хуки сами используют useEffect внутри)
  useWaveSpawner(screen);
  useGameLoop();
  useWaveAutoStart();

  const ready = screen.width > 0 && screen.height > 0;
  if (!ready) return <div style={{ height: "100vh" }} suppressHydrationWarning />;

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "#0b0f17" }}>
      <div style={{position:"absolute", inset:0, pointerEvents:"none", zIndex:20}}>
        <div style={{pointerEvents:"auto"}}><GameHUD /></div>
        <div style={{pointerEvents:"auto"}}><ShopPanel /></div>
      </div>
      {/* БАЗА */}
      <div
        style={{
          position: "absolute",
          width: BASE_RADIUS * 2,
          height: BASE_RADIUS * 2,
          background: "linear-gradient(135deg, #13ce66, #0ea5e9)",
          borderRadius: "50%",
          boxShadow: "0 0 18px rgba(14,165,233,.35), inset 0 0 12px rgba(255,255,255,.25)",
          transform: "translate(-50%, -50%)",
          left: center.x,
          top: center.y,
          display: "grid",
          placeItems: "center",
          color: "#012",
          fontWeight: 800,
          fontSize: 10,
          letterSpacing: 1,
        }}
      >
        BASE
      </div>

      {/* ВРАГИ */}
      {enemies.map(e => (
        <div
          key={e.id}
          style={{
            position: "absolute",
            width: ENEMY_RADIUS * 2,
            height: ENEMY_RADIUS * 2,
            left: e.x - ENEMY_RADIUS,
            top: e.y - ENEMY_RADIUS,
            borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, #ff9aa2, #ff3b3b)",
            boxShadow: "0 0 10px rgba(255,60,60,.55)",
            border: "1px solid rgba(255,255,255,.15)",
          }}
          title={`HP: ${e.hp}`}
        />
      ))}

      {/* БАШНИ */}
      {towers.map(t => {
        const selected = t.id === selectedId;
        return (
          <div
            key={t.id}
            onMouseDown={(e) => e.stopPropagation()} // гасим раньше
            onClick={(e) => { e.stopPropagation(); selectTower(t.id); }}
            style={{
              position: "absolute",
              width: 30,
              height: 30,
              left: t.x - 15,
              top: t.y - 15,
              zIndex: 1,
              borderRadius: 10,
              background: t.cooldownMs > 0 ? "linear-gradient(180deg, #2563eb, #1d4ed8)" : "linear-gradient(180deg, #4f46e5, #6366f1)",
              border: selected ? "2px solid #fbbf24" : "1px solid rgba(255,255,255,.15)",
              boxShadow: selected ? "0 0 20px rgba(251,191,36,.6)" : "0 6px 20px rgba(99,102,241,.25), inset 0 -3px 8px rgba(255,255,255,.12)",
              cursor: "pointer",
            }}
            title={`Радиус: ${Math.round(towerRange(t))}`}
          >
            {selected && (
              <div
                style={{
                  position: "absolute",
                  left: 15 - towerRange(t),
                  top: 15 - towerRange(t),
                  width: towerRange(t) * 2,
                  height: towerRange(t) * 2,
                  borderRadius: "50%",
                  border: "1px dashed rgba(255,255,255,.2)",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        );
      })}

      {/* ПУЛИ */}
      {bullets.map(b => (
        <div
          key={b.id}
          style={{
            position: "absolute",
            width: BULLET_RADIUS * 2,
            height: BULLET_RADIUS * 2,
            left: b.x - BULLET_RADIUS,
            top: b.y - BULLET_RADIUS,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #fff, #ffd166)",
            boxShadow: "0 0 8px rgba(255,209,102,.8)",
          }}
        />
      ))}

      {/* Клик по полю — постановка башни */}
      <div
        style={{ position: "absolute", inset: 0, cursor: "crosshair", zIndex: 0 }}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          useGameStore.getState().placeTower(x, y);
        }}
        title={`Кликните для установки (стоимость ${TOWER_COST})`}
      />
    </div>
  );
}
