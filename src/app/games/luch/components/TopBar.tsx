"use client";

import React from "react";
import { describeMask } from "../engine/utils";
import { Logo } from "./topbar/Logo";
import { DifficultySelect, type Diff } from "./topbar/DifficultySelect";
import { SeedInput } from "./topbar/SeedInput";
import { GenerateButton } from "./topbar/GenerateButton";
import { GoalBadge } from "./topbar/GoalBadge";

type Props = {
  compact?: boolean;
  difficulty: Diff;
  seed: string;
  requiredMask: number;
  onChangeDifficulty: (d: Diff) => void;
  onSeedChange: (s: string) => void;
  onSeedCommit: () => void;
  onGenerate: () => void;
};

/** Верхняя панель — тонкая, адаптивная, на Tailwind */
export default function TopBar({
  compact, difficulty, seed, requiredMask,
  onChangeDifficulty, onSeedChange, onSeedCommit, onGenerate
}: Props) {
  // базовые размеры: компактный / обычный режим
  const padY = compact ? "py-1.5" : "py-2";
  const padX = compact ? "px-3" : "px-4";
  const text = "text-sm"; // тоньше шрифт

  return (
    <div className="w-full flex justify-center">
      <div
        className={[
          "w-full max-w-[1280px]",
          "rounded-2xl border border-white/10",
          "bg-white/5 backdrop-blur-sm",
          "shadow-[0_10px_28px_rgba(0,0,0,0.45)] ring-1 ring-white/5",
          padY, padX, text,
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Logo title="Light Beams 360" />

          <div className="ms-auto flex flex-wrap items-center gap-2 md:gap-3">
            <DifficultySelect
              value={difficulty}
              onChange={onChangeDifficulty}
              compact={compact}
            />
            <SeedInput
              value={seed}
              onChange={onSeedChange}
              onCommit={onSeedCommit}
              compact={compact}
            />
            <GenerateButton onPress={onGenerate} compact={compact}>
              Новый уровень
            </GenerateButton>
            <GoalBadge text={`Цель: ${describeMask(requiredMask)}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
