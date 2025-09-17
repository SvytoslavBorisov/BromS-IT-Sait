"use client";

import React from "react";

export function GoalBadge({ text }: { text: string }) {
  return (
    <div
      className={[
        "rounded-xl border border-white/20",
        "bg-gradient-to-br from-pink-400/15 to-cyan-300/15",
        "px-3 py-2 font-extrabold tracking-tight text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]",
      ].join(" ")}
    >
      {text}
    </div>
  );
}
