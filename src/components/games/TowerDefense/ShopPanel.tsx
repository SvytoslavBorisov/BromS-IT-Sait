"use client";
import { useMemo, useEffect, useRef } from "react";
import { useGameStore } from "@/components/games/TowerDefense/store";
import { TOWER_COST } from "@/components/games/TowerDefense/config";

export function ShopPanel() {
  const gold = useGameStore(s => s.gold);
  const selectedId = useGameStore(s => s.selectedTowerId);
  const towers = useGameStore(s => s.towers);
  const selectTower = useGameStore(s => s.selectTower);
  const placeTower = useGameStore(s => s.placeTower);
  const upgrade = useGameStore(s => s.upgradeSelectedTower);
  const sell = useGameStore(s => s.sellSelectedTower);
  const towerRange = useGameStore(s => s.towerRange);
  const towerDamage = useGameStore(s => s.towerDamage);
  const towerCooldown = useGameStore(s => s.towerCooldown);
  const upgradeCost = useGameStore(s => s.upgradeCost);
    const center = useMemo(() => ({ x: screen.width / 2, y: screen.height / 2 }), [screen]);
    const setCenter = useGameStore(s => s.setCenter);
  const t = towers.find(x => x.id === selectedId) || null;

    useEffect(() => {
        setCenter(center);
    }, [center, setCenter]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        right: 12, top: 10,
        zIndex: 20,                  // <-- ВАЖНО
        width: 260, padding: 12, borderRadius: 12,
        background: "rgba(2,6,23,.6)",
        color: "#e6f0ff",
        border: "1px solid rgba(255,255,255,.12)",
        backdropFilter: "blur(8px)",
        pointerEvents: "auto",       // явное
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>🛒 Магазин</div>

      <div style={{ display: "grid", gap: 8 }}>
        <button
          onClick={() => {/* режим постановки — по клику на поле */}}
          disabled={gold < TOWER_COST}
          title="Кликните по полю, чтобы поставить"
          style={{ padding: "8px 10px", borderRadius: 10, background: gold >= TOWER_COST ? "#4f46e5" : "#334155", color: "white", border: "1px solid rgba(255,255,255,.15)" }}
        >
          🏗️ Поставить башню — {TOWER_COST}
        </button>

        {t ? (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed rgba(255,255,255,.12)" }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>🎯 Выбрана башня</div>
            <div style={{ fontSize: 13, opacity: .95, lineHeight: 1.4 }}>
              Уровень: <b>{t.level}</b><br />
              Урон: <b>{towerDamage(t).toFixed(1)}</b><br />
              Радиус: <b>{Math.round(towerRange(t))} px</b><br />
              КД: <b>{Math.round(towerCooldown(t))} мс</b>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={upgrade}
                disabled={gold < upgradeCost(t.level)}
                style={{ padding: "6px 10px", borderRadius: 8, background: gold >= upgradeCost(t.level) ? "#22c55e" : "#334155", color: "white", border: "1px solid rgba(255,255,255,.15)" }}
              >
                ⬆️ Апгрейд — {upgradeCost(t.level)}
              </button>
              <button
                onClick={sell}
                style={{ padding: "6px 10px", borderRadius: 8, background: "#ef4444", color: "white", border: "1px solid rgba(255,255,255,.15)" }}
              >
                💸 Продать
              </button>
              <button
                onClick={() => selectTower(null)}
                style={{ padding: "6px 10px", borderRadius: 8, background: "#475569", color: "white", border: "1px solid rgba(255,255,255,.15)" }}
              >
                ❌ Снять
              </button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, opacity: .8 }}>Нажмите по башне, чтобы выбрать её</div>
        )}
      </div>
    </div>
  );
}
