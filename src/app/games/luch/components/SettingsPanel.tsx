"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Difficulty } from "../engine/types";
import { useLeaderboard } from "../hooks/useLeaderboard";

type Props = {
  compact?: boolean;
  difficulty: Difficulty;
  seed: string;
  onChangeSeed: (s: string) => void;     // оставляем сигнатуры, но UI их не дублирует
  onCommitSeed: () => void;              // — чтобы не повторять верхний бар
  onChangeDifficulty: (d: Difficulty) => void;
  onNew: () => void;
};

/** Нижний HUD & Tools: компактная утилитарная панель под канвасом */
export default function SettingsPanel({
  compact, difficulty, seed, onNew,
}: Props) {
  const { entries } = useLeaderboard(difficulty, seed);

  // лучший (минимальный) результат по текущему уровню
  const best = useMemo(() => (entries?.[0]?.length ?? null), [entries]);

  // goalMode — как игрок хочет оценивать прохождение (сохраняется локально)
  type GoalMode = "min-length" | "min-bounces";
  const [goalMode, setGoalMode] = useState<GoalMode>(() => {
    if (typeof window === "undefined") return "min-length";
    return (localStorage.getItem("luch:goalMode") as GoalMode) || "min-length";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("luch:goalMode", goalMode);
    // Шлём событие — на будущее (канвас/логика могут подхватить)
    window.dispatchEvent(new CustomEvent("luch:goalMode", { detail: { goalMode } }));
  }, [goalMode]);

  const padY = compact ? "py-1.5" : "py-2";
  const padX = compact ? "px-3"  : "px-4";

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op
    }
  }, []);

  const copySeed = useCallback(() => copy(seed), [copy, seed]);

  const copyLink = useCallback(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/games/luch?seed=${encodeURIComponent(seed)}&difficulty=${encodeURIComponent(String(difficulty))}`;
    copy(url);
  }, [copy, seed, difficulty]);

  return (
    <div
      className={[
        "w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm",
        "shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/5",
        "flex flex-wrap items-center gap-2 md:gap-3",
        padY, padX, "text-sm",
      ].join(" ")}
    >
      {/* Левая часть: бейдж и мини-саммари */}
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white/80">
          HUD &amp; Tools
        </span>
        <span className="hidden sm:inline text-white/70">
          Seed: <b className="text-white/90">{seed}</b>
        </span>
        <span className="hidden sm:inline text-white/70">
          | Сложность: <b className="text-white/90">{difficulty}</b>
        </span>
        <span className="hidden md:inline text-white/70">
          | Лучший результат:{" "}
          <b className="text-white/90">{best != null ? best.toFixed(1) : "—"}</b>
        </span>
      </div>

      {/* Центр: выбор цели прохождения (режим оценивания) */}
      <div className="ms-auto flex items-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
          <span className="text-white/70">Цель</span>
          <select
            value={goalMode}
            onChange={(e) => setGoalMode(e.target.value as GoalMode)}
            className="rounded-md border border-white/20 bg-transparent px-2 py-1 text-white outline-none hover:border-white/30 focus:border-white/40"
          >
            <option value="min-length">минимальная длина</option>
            <option value="min-bounces">минимум отражений</option>
          </select>
        </label>
      </div>

      {/* Правая часть: действия */}
      <div className="ms-auto flex items-center gap-2">
        <button
          onClick={copySeed}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-white/90 hover:bg-white/10 active:scale-[0.99] transition"
          title="Скопировать seed"
        >
          Скопировать seed
        </button>
        <button
          onClick={copyLink}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-white/90 hover:bg-white/10 active:scale-[0.99] transition"
          title="Скопировать ссылку на этот уровень"
        >
          Ссылка на уровень
        </button>
        <button
          onClick={onNew}
          className="rounded-lg border border-cyan-300/40 bg-gradient-to-b from-cyan-300/20 to-cyan-300/10 px-3.5 py-2 font-extrabold text-cyan-100 shadow-[0_6px_18px_rgba(124,214,255,0.14)] hover:from-cyan-300/30 hover:to-cyan-300/20 active:scale-[0.99] transition"
          title="Сгенерировать новый уровень"
        >
          Новый уровень
        </button>
      </div>
    </div>
  );
}
