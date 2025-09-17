"use client";

import React from "react";

export type Diff = "easy" | "normal" | "hard" | "insane";

export function DifficultySelect({
  value, onChange, compact,
}: {
  value: Diff;
  compact?: boolean;
  onChange: (d: Diff) => void;
}) {
  const pad = compact ? "px-2 py-1" : "px-2.5 py-1.5";
  return (
    <label className={[
      "inline-flex items-center gap-2 font-semibold",
      "rounded-xl border border-white/10 bg-white/5",
      pad,
    ].join(" ")}>
      <span className="text-white/80">Сложность</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Diff)}
        className={[
          "outline-none rounded-lg border border-white/20 bg-transparent text-white",
          "px-2 py-1",
          "hover:border-white/30 focus:border-white/40",
        ].join(" ")}
      >
        <option value="easy">easy</option>
        <option value="normal">normal</option>
        <option value="hard">hard</option>
        <option value="insane">insane</option>
      </select>
    </label>
  );
}
