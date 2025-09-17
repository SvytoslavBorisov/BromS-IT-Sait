"use client";

import React from "react";

export function SeedInput({
  value, onChange, onCommit, compact,
}: {
  value: string;
  compact?: boolean;
  onChange: (s: string) => void;
  onCommit: () => void;
}) {
  const pad = compact ? "px-2 py-1" : "px-2.5 py-1.5";
  return (
    <label className={[
      "inline-flex items-center gap-2 font-semibold",
      "rounded-xl border border-white/10 bg-white/5",
      pad,
    ].join(" ")}>
      <span className="text-white/80">Seed</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        placeholder="seed"
        className={[
          "w-36 rounded-lg border border-white/20 bg-transparent",
          "px-2 py-1 text-white outline-none",
          "placeholder:text-white/40",
          "hover:border-white/30 focus:border-white/40",
        ].join(" ")}
      />
    </label>
  );
}
