// app/games/luch/startmenu/Controls/ActionBar.tsx
"use client";

import React from "react";
import NeonButton from "../ui/NeonButton";

type Props = {
  onStart: () => void;
  seed: string;
  difficulty: "easy" | "normal" | "hard" | "insane";
};

export default function ActionBar({ onStart, seed, difficulty }: Props) {
  const share = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("seed", seed);
      url.searchParams.set("difficulty", difficulty);
      if (navigator.share) await navigator.share({ title: "Light Beams 360", url: url.toString() });
      else if (navigator.clipboard) await navigator.clipboard.writeText(url.toString());
    } catch { /* ignore */ }
  };

  return (
    <div className="row">
      <NeonButton onClick={onStart} size="lg" emphasis>
        Играть
      </NeonButton>
      <NeonButton onClick={share} variant="ghost">Поделиться</NeonButton>
      <span className="hint">Enter — старт • Ctrl+R — Random seed</span>

      <style jsx>{`
        .row {
          display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
          margin-top: 16px;
        }
        .hint { opacity: .7; font-size: 12px }
      `}</style>
    </div>
  );
}
