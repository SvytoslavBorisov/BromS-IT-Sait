"use client";

import React from "react";
import { describeMask } from "../engine/utils";
import { Difficulty } from "../engine/types";

type Props = {
  seed: string;
  difficulty: Difficulty;
  requiredMask: number;
  opened: boolean;
  onToggle: () => void;
  onNew: () => void;
  onChangeSeed: (s: string) => void;
  onCommitSeed: () => void;
  onChangeDifficulty: (d: Difficulty) => void;

  // блок поворота
  targets: { id: string; label: string }[];      // список целей для поворота
  activeTargetId: string;
  onSelectTarget: (id: string) => void;
  onRotate: (deltaDeg: number) => void;
};

/** Шторка + блок поворота для мобильной версии */
export default function MobileControls({
  seed, difficulty, requiredMask, opened,
  onToggle, onNew, onChangeSeed, onCommitSeed, onChangeDifficulty,
  targets, activeTargetId, onSelectTarget, onRotate
}: Props) {
  return (
    <>
      {/* Кнопка шторки */}
      <div style={{ position: "absolute", top: 10, right: 10, zIndex: 35 }}>
        <button
          onPointerDown={onToggle}
          aria-expanded={opened}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.10)",
            color: "#fff",
            fontWeight: 800
          }}
        >
          ⚙︎
        </button>
      </div>

      {/* Шторка */}
      {opened && (
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: 0,
            background: "rgba(12,14,20,0.92)", padding: "16px 12px 8px",
            borderBottom: "1px solid rgba(255,255,255,0.12)", zIndex: 36
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 800 }}>Настройки</div>
            <div style={{ marginLeft: "auto" }}>
              <button
                onPointerDown={onToggle}
                style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff" }}
              >Закрыть</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <span>Сложность:</span>
              <select
                value={difficulty}
                onChange={(e) => onChangeDifficulty(e.target.value as any)}
                style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 8px" }}
              >
                <option value="easy">easy</option>
                <option value="normal">normal</option>
                <option value="hard">hard</option>
                <option value="insane">insane</option>
              </select>
            </label>
            <button
              onPointerDown={onNew}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(124,214,255,0.12)", color: "#7cd6ff", fontWeight: 700 }}
            >
              Новый
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <span>Seed:</span>
              <input
                value={seed}
                onChange={(e) => onChangeSeed(e.target.value)}
                onBlur={onCommitSeed}
                placeholder="seed"
                style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 8px", width: 130 }}
              />
            </label>
            <div style={{
              padding: "6px 8px",
              borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)",
              color: "#ffffff", fontWeight: 800
            }}>
              Цель: {describeMask(requiredMask)}
            </div>
          </div>
        </div>
      )}

      {/* Блок поворота + выбор цели */}
      <div style={{
        position: "absolute",
        left: 0, right: 0,
        bottom: "calc(env(safe-area-inset-bottom,0px) + 76px)",
        display: "flex", justifyContent: "space-between", gap: 8,
        padding: "8px 12px",
        zIndex: 35
      }}>
        <div style={{
          flex: 1,
          display: "flex", gap: 8,
          background: "rgba(20,20,28,0.72)",
          border: "1px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(8px)",
          borderRadius: 12,
          padding: 8
        }}>
          {targets.map(t => (
            <button
              key={t.id}
              onPointerDown={() => onSelectTarget(t.id)}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.2)",
                background: activeTargetId === t.id ? "rgba(255,255,255,0.12)" : "transparent",
                color: "#fff", fontWeight: 800
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onPointerDown={() => onRotate(-7)}
            style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.10)", color: "#fff", fontWeight: 900 }}
          >⟲</button>
          <button
            onPointerDown={() => onRotate(+7)}
            style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.10)", color: "#fff", fontWeight: 900 }}
          >⟳</button>
        </div>
      </div>
    </>
  );
}
