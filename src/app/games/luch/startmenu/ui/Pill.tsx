// app/games/luch/startmenu/ui/Pill.tsx
"use client";

import React from "react";

export default function Pill({
  active, onClick, children,
}: { active?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button className={`pill ${active ? "on" : ""}`} onClick={onClick}>
      {children}
      <style jsx>{`
        .pill {
          padding: 7px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.16);
          background: rgba(255,255,255,.04);
          color: #e9effa;
          font-weight: 700;
          cursor: pointer;
        }
        .pill.on {
          border-color: rgba(124,214,255,.55);
          box-shadow: 0 0 0 3px rgba(124,214,255,.16) inset;
          color: #cfefff;
        }
      `}</style>
    </button>
  );
}
