// app/games/luch/startmenu/ui/NeonButton.tsx
"use client";

import React from "react";

type Props = {
  onClick?: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "solid" | "ghost";
  emphasis?: boolean;
};

export default function NeonButton({
  onClick, children, size = "md", variant = "solid", emphasis = false,
}: Props) {
  const pad = size === "lg" ? "12px 16px" : size === "sm" ? "6px 10px" : "9px 12px";
  const fw = emphasis ? 900 : 800;

  return (
    <button onClick={onClick} className={`nb ${variant}`} style={{ padding: pad, fontWeight: fw }}>
      {children}
      <style jsx>{`
        .nb {
          border-radius: 12px;
          letter-spacing: .2px;
          cursor: pointer;
          transition: transform .06s ease, box-shadow .2s ease, border-color .2s ease;
          user-select: none;
          outline: none;
        }
        .nb:active { transform: translateY(1px) }
        .nb.solid {
          border: 1px solid rgba(124,214,255,.35);
          background: linear-gradient(180deg, rgba(124,214,255,.22), rgba(124,214,255,.12));
          color: #a7e3ff;
          text-shadow: 0 0 12px rgba(124,214,255,.35);
          box-shadow: 0 8px 22px rgba(124,214,255,.14);
        }
        .nb.ghost {
          border: 1px solid rgba(255,255,255,.16);
          background: rgba(255,255,255,.04);
          color: #e9effa;
        }
        .nb:hover { box-shadow: 0 10px 26px rgba(124,214,255,.18) }
        .nb.ghost:hover { border-color: rgba(124,214,255,.45) }
      `}</style>
    </button>
  );
}
