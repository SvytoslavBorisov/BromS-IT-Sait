"use client";

import React from "react";
import { Difficulty } from "../engine/types";

type Props = {
  compact?: boolean;
  difficulty: Difficulty;
  seed: string;
  onChangeSeed: (s: string) => void;
  onCommitSeed: () => void;
  onChangeDifficulty: (d: Difficulty) => void;
  onNew: () => void;
};

/** Нижняя панель настроек (в потоке, не перекрывает поле) */
export default function SettingsPanel({
  compact, difficulty, seed, onChangeSeed, onCommitSeed, onChangeDifficulty, onNew
}: Props) {
  return (
    <div
      style={{
        padding: compact ? "10px 12px" : "12px 16px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)",
        background: "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02))",
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontWeight: 700, opacity: 0.9 }}>Настройки</div>
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

      <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <span>Seed:</span>
        <input
          value={seed}
          onChange={(e) => onChangeSeed(e.target.value)}
          onBlur={onCommitSeed}
          placeholder="seed"
          style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 8px", width: 160 }}
        />
      </label>

      <button
        onPointerDown={onNew}
        style={{
          marginLeft: "auto",
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "linear-gradient(180deg, rgba(124,214,255,.18), rgba(124,214,255,.12))",
          color: "#7cd6ff",
          fontWeight: 800
        }}
      >
        Новый уровень
      </button>
    </div>
  );
}
