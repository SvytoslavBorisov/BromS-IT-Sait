// app/games/luch/startmenu/StartMenu.tsx
"use client";

import React, { useCallback, useEffect } from "react";
import Background from "./Background";
import Header from "./Header";
import DifficultyPicker from "./Controls/DifficultyPicker";
import SeedField from "./Controls/SeedField";
import ActionBar from "./Controls/ActionBar";
import Tips from "./Controls/Tips";
import Leaderboard from "../ui/Leaderboard";
import { useLeaderboard } from "../hooks/useLeaderboard";

type Props = {
  seed: string;
  difficulty: "easy" | "normal" | "hard" | "insane";
  onSeedChange: (s: string) => void;
  onDifficultyChange: (d: Props["difficulty"]) => void;
  onStart: () => void;
};

export default function StartMenu({
  seed, difficulty, onSeedChange, onDifficultyChange, onStart,
}: Props) {
  const { entries } = useLeaderboard(difficulty, seed);

  // Горячие клавиши: Enter — старт, Ctrl/Cmd+R — новый seed (без перезагрузки страницы)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") onStart();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
        e.preventDefault();
        onSeedChange(Math.random().toString(36).slice(2, 10));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSeedChange, onStart]);

  const handlePreset = useCallback(
    (preset: "puzzle" | "lab" | "chaos") => {
      const tag = preset === "puzzle" ? "puz" : preset === "lab" ? "lab" : "cha";
      onDifficultyChange(preset === "puzzle" ? "easy" : preset === "lab" ? "normal" : "hard");
      onSeedChange(`${tag}-${Math.random().toString(36).slice(2, 7)}`);
    },
    [onDifficultyChange, onSeedChange]
  );

  return (
    <div className="relative grid gap-6 md:grid-cols-[1fr_320px]">
      {/* Левая колонка: фон + карточка */}
      <div className="relative min-h-dvh grid place-items-center p-4 md:p-8">
        {/* Фон под контентом */}
        <div className="absolute inset-0 -z-10">
          <Background />
        </div>

        {/* Карточка */}
        <div className="w-full max-w-[920px] rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 shadow-[0_16px_44px_rgba(0,0,0,0.55)] ring-1 ring-white/5 backdrop-blur-sm">
          <Header />

          <div className="mt-4 grid grid-cols-1 gap-4 md:[grid-template-columns:1.2fr_1fr]">
            <DifficultyPicker
              difficulty={difficulty}
              onChange={onDifficultyChange}
              onPreset={handlePreset}
            />
            <SeedField seed={seed} onChange={onSeedChange} />
          </div>

          <ActionBar onStart={onStart} seed={seed} difficulty={difficulty} />

          <div className="mt-4">
            <Tips />
          </div>
        </div>
      </div>

      {/* Правая колонка: Лидерборд */}
      <div className="p-4 md:p-6">
        <Leaderboard title="Рекорды уровня" entries={entries} />
      </div>
    </div>
  );
}
