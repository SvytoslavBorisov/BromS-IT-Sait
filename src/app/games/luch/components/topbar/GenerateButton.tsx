"use client";

import React from "react";

export function GenerateButton({
  children, onPress, compact,
}: {
  children: React.ReactNode;
  onPress: () => void;
  compact?: boolean;
}) {
  const pad = compact ? "px-3 py-1.5" : "px-3.5 py-2";
  return (
    <button
      onClick={onPress}
      className={[
        "select-none rounded-xl border",
        "border-cyan-300/40 bg-gradient-to-b from-cyan-300/20 to-cyan-300/10",
        "text-cyan-100 font-extrabold tracking-tight",
        "shadow-[0_8px_22px_rgba(124,214,255,0.14)]",
        "hover:from-cyan-300/30 hover:to-cyan-300/20",
        "active:scale-[0.99] transition",
        pad,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
