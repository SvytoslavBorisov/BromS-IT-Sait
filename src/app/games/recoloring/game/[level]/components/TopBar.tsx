"use client";

import React from "react";
import { describeMask } from "../engine/utils";

type Props = {
  compact?: boolean;
  difficulty: "easy" | "normal" | "hard" | "insane";
  seed: string;
  requiredMask: number;
  onChangeDifficulty: (d: "easy" | "normal" | "hard" | "insane") => void;
  onSeedChange: (s: string) => void;
  onSeedCommit: () => void;
  onGenerate: () => void;
};

/** Верхняя панель в потоке документа (НЕ перекрывает поле) */
export default function TopBar({
  compact, difficulty, seed, requiredMask,
  onChangeDifficulty, onSeedChange, onSeedCommit, onGenerate
}: Props) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1280,
        margin: "16px auto 0",
        padding: compact ? "10px 12px" : "12px 16px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02))",
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
        color: "#e8eef7",
      }}
    >
      <div style={{ fontWeight: 800, letterSpacing: .3 }}>Light Beams 360</div>

      <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 600 }}>
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

        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 600 }}>
          <span>Seed:</span>
          <input
            value={seed}
            onChange={(e) => onSeedChange(e.target.value)}
            onBlur={onSeedCommit}
            placeholder="seed"
            style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 8px", width: 120 }}
          />
        </label>

        <button
          onPointerDown={onGenerate}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(124,214,255,0.12)",
            color: "#7cd6ff",
            fontWeight: 700
          }}
        >
          Новый уровень
        </button>

        <div style={{
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.2)",
          color: "#ffffff",
          fontWeight: 700
        }}>
          Цель: {describeMask(requiredMask)}
        </div>
      </div>
    </div>
  );
}
