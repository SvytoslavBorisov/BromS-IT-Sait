"use client";
import React from "react";
import PitchCard from "./PitchCard";
import type { TeamLineup } from "../lib/positions";
import { MatchSummaryPanel } from "../match/MatchSummaryPanel";

/**
 * Вертикальные поля: слева и справа — команды, по центру сводка по матчу.
 * ВАЖНО: teamId берём из ключей Map<number, TeamLineup>, а подписи — максимально безопасно.
 */
export function TeamLineupTab({ lineups }: { lineups: Map<number, TeamLineup> }) {
  const entries = Array.from(lineups.entries()); // [ [teamId, lineup], ... ]
  const leftId = entries[0]?.[0];
  const rightId = entries[1]?.[0];
  const left = entries[0]?.[1];
  const right = entries[1]?.[1];

  // Пытаемся найти удобные подписи из структуры TeamLineup; если их нет — даём дефолты.
  const safeName = (lin: TeamLineup | undefined, fallback: string) => {
    // Популярные варианты, встречающиеся в подобных проектах:
    // teamName / name / title / label. Если ни одного нет — fallback.
    const anyLin = lin as unknown as Record<string, any> | undefined;
    return (
      (anyLin?.teamName as string) ||
      (anyLin?.name as string) ||
      (anyLin?.title as string) ||
      (anyLin?.label as string) ||
      fallback
    );
  };

  const leftLabel = safeName(left, leftId != null ? `Team ${leftId}` : "Team A");
  const rightLabel = safeName(right, rightId != null ? `Team ${rightId}` : "Team B");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Левая команда */}
      <PitchCard data={left} side="left" />

      {/* Центр: сводные метрики матча */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 p-4 hidden lg:block">
        <MatchSummaryPanel
          left={left}
          right={right}
          leftId={leftId}
          rightId={rightId}
          leftLabel={leftLabel}
          rightLabel={rightLabel}
        />
      </div>

      {/* Правая команда */}
      <PitchCard data={right} side="right" />
    </div>
  );
}
