"use client";

import React from "react";
import { LeaderboardEntry } from "../state/leaderboard";

export default function Leaderboard({
  title,
  entries,
}: {
  title?: string;
  entries: LeaderboardEntry[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur">
      <div className="mb-3 text-sm uppercase tracking-wide text-white/60">
        {title ?? "Лучшие результаты"}
      </div>
      {entries.length === 0 ? (
        <div className="text-white/50 text-sm">Пока пусто. Будь первым!</div>
      ) : (
        <ol className="space-y-2">
          {entries.map((e, i) => (
            <li key={e.at + ":" + i} className="flex items-center justify-between text-sm">
              <span className="text-white/80">{i + 1}.</span>
              <span className="text-white/90">
                {e.name ?? "Игрок"} — длина: {e.length.toFixed(1)}
              </span>
              <span className="text-white/60">{(e.ms / 1000).toFixed(2)}s</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
