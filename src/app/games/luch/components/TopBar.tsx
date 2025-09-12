// app/games/luch/components/TopBar.tsx
"use client";

import React from "react";
import { describeMask } from "../engine/utils";

type Diff = "easy" | "normal" | "hard" | "insane";

type Props = {
  compact?: boolean;
  difficulty: Diff;
  seed: string;
  requiredMask: number;
  onChangeDifficulty: (d: Diff) => void;
  onSeedChange: (s: string) => void;
  onSeedCommit: () => void;
  onGenerate: () => void;
};

/** Верхняя панель в потоке документа (НЕ перекрывает поле) — новая версия */
export default function TopBar({
  compact, difficulty, seed, requiredMask,
  onChangeDifficulty, onSeedChange, onSeedCommit, onGenerate
}: Props) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1280,
        margin: compact ? "12px auto 0" : "18px auto 0",
        padding: compact ? "10px 12px" : "14px 16px",
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.03)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.02))",
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
        color: "#e8eef7",
        backdropFilter: "blur(6px)",
      }}
    >
      {/* Логотип и название */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "linear-gradient(135deg, #7cd6ff33, #ff6aa033)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)",
          display: "grid", placeItems: "center"
        }}>
          <div style={{
            width: 14, height: 14, transform: "rotate(45deg)",
            background: "conic-gradient(from 0deg, #7cd6ff, #9cff7c, #ff6aa0, #7cd6ff)",
            borderRadius: 4
          }}/>
        </div>
        <div style={{ fontWeight: 900, letterSpacing: .3 }}>Light Beams 360</div>
      </div>

      {/* Правый блок */}
      <div style={{
        marginLeft: "auto",
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        {/* Difficulty */}
        <label style={{
          display: "inline-flex", gap: 8, alignItems: "center",
          fontWeight: 700,
          padding: "6px 8px",
          borderRadius: 12,
          background: "rgba(255,255,255,.035)",
          border: "1px solid rgba(255,255,255,.10)",
        }}>
          <span style={{ opacity: .9 }}>Сложность</span>
          <select
            value={difficulty}
            onChange={(e) => onChangeDifficulty(e.target.value as any)}
            style={{
              appearance: "none",
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 10,
              padding: "6px 8px",
              outline: "none",
            }}
          >
            <option value="easy">easy</option>
            <option value="normal">normal</option>
            <option value="hard">hard</option>
            <option value="insane">insane</option>
          </select>
        </label>

        {/* Seed */}
        <label style={{
          display: "inline-flex", gap: 8, alignItems: "center",
          fontWeight: 700,
          padding: "6px 8px",
          borderRadius: 12,
          background: "rgba(255,255,255,.035)",
          border: "1px solid rgba(255,255,255,.10)",
        }}>
          <span style={{ opacity: .9 }}>Seed</span>
          <input
            value={seed}
            onChange={(e) => onSeedChange(e.target.value)}
            onBlur={onSeedCommit}
            placeholder="seed"
            style={{
              background: "transparent",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 10,
              padding: "6px 8px",
              width: 140,
              outline: "none",
            }}
          />
        </label>

        {/* Generate */}
        <button
          onPointerDown={onGenerate}
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(124,214,255,0.35)",
            background: "linear-gradient(180deg, rgba(124,214,255,.22), rgba(124,214,255,.12))",
            color: "#a7e3ff",
            fontWeight: 900,
            letterSpacing: .2,
            textShadow: "0 0 10px rgba(124,214,255,.35)",
            boxShadow: "0 8px 22px rgba(124,214,255,.14)",
            cursor: "pointer",
          }}
        >
          Новый уровень
        </button>

        {/* Goal */}
        <div style={{
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.16)",
          background:
            "linear-gradient(135deg, rgba(255,106,160,.12), rgba(124,214,255,.12))",
          color: "#ffffff",
          fontWeight: 900,
          letterSpacing: .2,
          boxShadow: "0 8px 24px rgba(0,0,0,.25)",
        }}>
          Цель: {describeMask(requiredMask)}
        </div>
      </div>
    </div>
  );
}
