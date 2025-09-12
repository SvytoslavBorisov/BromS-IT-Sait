// app/games/luch/StartMenu.tsx
"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

type Props = {
  seed: string;
  difficulty: "easy" | "normal" | "hard" | "insane";
  onSeedChange: (s: string) => void;
  onDifficultyChange: (d: Props["difficulty"]) => void;
  onStart: () => void;
};

const EASE: [number, number, number, number] = [0.26, 0.08, 0.25, 1];

export default function StartMenu({
  seed, difficulty, onSeedChange, onDifficultyChange, onStart,
}: Props) {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "grid",
      placeItems: "center",
      padding: "32px 16px",
      background:
        "radial-gradient(1200px 600px at 10% -10%, rgba(124,214,255,.10), transparent 60%)," +
        "radial-gradient(900px 500px at 100% -10%, rgba(255,106,160,.10), transparent 60%)," +
        "linear-gradient(180deg, #0b0e12 0%, #0b0e12 100%)",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: .6, ease: EASE }}
        style={{
          width: "100%",
          maxWidth: 860,
          borderRadius: 20,
          padding: 24,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 12px 40px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.03)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025))",
          color: "#eaf0f8",
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg, #7cd6ff33, #ff6aa033)",
            display: "grid", placeItems: "center",
            boxShadow: "0 8px 22px rgba(0,0,0,.45) inset, 0 0 0 1px rgba(255,255,255,.06)"
          }}>
            {/* Мини-эмблема «призма» */}
            <div style={{
              width: 24, height: 24, transform: "rotate(45deg)",
              background: "conic-gradient(from 0deg, #7cd6ff, #9cff7c, #ff6aa0, #7cd6ff)",
              borderRadius: 6, filter: "saturate(1.1) brightness(1.1)",
            }}/>
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: .3 }}>
              Light Beams 360
            </div>
            <div style={{ opacity: .8 }}>
              Отрази лучи. Смешай RGB. Достигни целевого спектра.
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
        }}>
          <div style={{
            display: "flex", gap: 12, flexWrap: "wrap",
            alignItems: "center"
          }}>
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
              <span style={{ opacity: .9 }}>Сложность</span>
              <select
                value={difficulty}
                onChange={(e) => onDifficultyChange(e.target.value as any)}
                style={{
                  background: "rgba(255,255,255,.04)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,.16)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  outline: "none"
                }}
              >
                <option value="easy">easy</option>
                <option value="normal">normal</option>
                <option value="hard">hard</option>
                <option value="insane">insane</option>
              </select>
            </label>

            <label style={{
              display: "inline-flex", gap: 8, alignItems: "center", fontWeight: 600
            }}>
              <span style={{ opacity: .9 }}>Seed</span>
              <input
                value={seed}
                onChange={(e) => onSeedChange(e.target.value)}
                placeholder="например, prisms-42"
                style={{
                  background: "rgba(255,255,255,.04)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,.16)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  width: 200,
                  outline: "none"
                }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={onStart}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                fontWeight: 800,
                letterSpacing: .2,
                border: "1px solid rgba(124,214,255,.35)",
                background:
                  "linear-gradient(180deg, rgba(124,214,255,.22), rgba(124,214,255,.12))",
                color: "#a7e3ff",
                textShadow: "0 0 12px rgba(124,214,255,.35)",
                boxShadow: "0 8px 22px rgba(124,214,255,.14)",
              }}
            >
              Играть
            </button>

            <details style={{
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 12,
              padding: "10px 12px",
              background: "rgba(255,255,255,.03)",
            }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>Как играть</summary>
              <div style={{ marginTop: 8, opacity: .9 }}>
                Перетаскивай зеркала и фильтры, чтобы направить лучи и смешать цвета в нужную маску.
                Слева направо — красный/зелёный/синий каналы. Цель уровня видна в верхней панели.
              </div>
            </details>

            <details style={{
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 12,
              padding: "10px 12px",
              background: "rgba(255,255,255,.03)",
            }}>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>О проекте</summary>
              <div style={{ marginTop: 8, opacity: .9 }}>
                Мини-игра на Next.js/React. Трассировка лучей, отражения, фильтры RGB, процедурная генерация уровней.
              </div>
            </details>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
