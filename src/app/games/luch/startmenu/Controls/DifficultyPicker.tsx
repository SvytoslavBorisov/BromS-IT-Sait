// app/games/luch/startmenu/Controls/DifficultyPicker.tsx
"use client";

import React from "react";
import Pill from "../ui/Pill";

type Props = {
  difficulty: "easy" | "normal" | "hard" | "insane";
  onChange: (d: Props["difficulty"]) => void;
  onPreset: (p: "puzzle" | "lab" | "chaos") => void;
};

const ITEMS: Array<{ v: Props["difficulty"]; label: string; hint: string }> = [
  { v: "easy",   label: "Easy",   hint: "Разогрев" },
  { v: "normal", label: "Normal", hint: "Сбалансировано" },
  { v: "hard",   label: "Hard",   hint: "Вызов" },
  { v: "insane", label: "Insane", hint: "Только для смелых" },
];

export default function DifficultyPicker({ difficulty, onChange, onPreset }: Props) {
  return (
    <section className="box">
      <h3>Сложность</h3>
      <div className="row">
        {ITEMS.map(it => (
          <Pill key={it.v} active={difficulty === it.v} onClick={() => onChange(it.v)}>
            {it.label}
          </Pill>
        ))}
      </div>
      <div className="presets">
        <span className="muted">Пресеты:</span>
        <button className="lnk" onClick={() => onPreset("puzzle")}>Puzzle</button>
        <span className="dot">·</span>
        <button className="lnk" onClick={() => onPreset("lab")}>Lab</button>
        <span className="dot">·</span>
        <button className="lnk" onClick={() => onPreset("chaos")}>Chaos</button>
      </div>

      <style jsx>{`
        .box {
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.08);
          padding: 14px;
          background: linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015));
        }
        h3 { margin: 0 0 10px 0; font-size: 14px; opacity: .9; letter-spacing: .2px; }
        .row { display: flex; flex-wrap: wrap; gap: 8px; }
        .presets { margin-top: 10px; font-size: 13px; display: flex; align-items: center; gap: 8px; }
        .muted { opacity: .75 }
        .dot { opacity: .5 }
        .lnk {
          background: none; color: #a7e3ff; border: none; padding: 0; cursor: pointer;
          text-decoration: underline dotted; text-underline-offset: 2px;
        }
        .lnk:hover { color: #d1f1ff }
      `}</style>
    </section>
  );
}
