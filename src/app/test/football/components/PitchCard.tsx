"use client";
import React from "react";
import Silhouette from "./Silhouette";
import { posToXY, TeamLineup } from "../lib/positions";
import { shortName } from "../lib/names";

export default function PitchCard({ data, side }: { data?: TeamLineup; side: "left" | "right" }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 overflow-hidden">
      {/* Заголовок */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="font-semibold text-neutral-900 dark:text-white truncate">{data?.teamName || "Команда"}</div>
        <div className="text-xs text-neutral-500">
          Схема: <span className="font-medium">{data?.formation || "—"}</span>
        </div>
      </div>

      {/* ВЕРТИКАЛЬНОЕ поле. SVG: viewBox 80×120 */}
      <div className="relative aspect-[5/7] bg-emerald-600/80">
        <svg viewBox="0 0 80 120" className="absolute inset-1 w-[calc(100%-0.5rem)] h-[calc(100%-0.5rem)]">
          {/* рамка */}
          <rect x="0" y="0" width="80" height="120" rx="1.5" ry="1.5" fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="1.5" />
          {/* середина */}
          <line x1="0" y1="60" x2="80" y2="60" stroke="white" strokeOpacity="0.5" />
          {/* центральный круг */}
          <circle cx="40" cy="60" r="9.15" fill="none" stroke="white" strokeOpacity="0.7" />

          {/* штрафные (верх/низ) */}
          <rect x="18" y="0" width="44" height="18" fill="none" stroke="white" strokeOpacity="0.7" />
          <rect x="18" y="102" width="44" height="18" fill="none" stroke="white" strokeOpacity="0.7" />

          {/* вратарские */}
          <rect x="28" y="0" width="24" height="6" fill="none" stroke="white" strokeOpacity="0.7" />
          <rect x="28" y="114" width="24" height="6" fill="none" stroke="white" strokeOpacity="0.7" />

          {/* точки пенальти */}
          <circle cx="40" cy="12" r="0.6" fill="white" />
          <circle cx="40" cy="108" r="0.6" fill="white" />

          {/* «D» дуги */}
          <path d="M 30.85 18 A 9.15 9.15 0 0 1 49.15 18" fill="none" stroke="white" strokeOpacity="0.7" />
          <path d="M 49.15 102 A 9.15 9.15 0 0 1 30.85 102" fill="none" stroke="white" strokeOpacity="0.7" />

          {/* ворота (для наглядности) */}
          <line x1="30" y1="0" x2="50" y2="0" stroke="white" strokeOpacity="0.8" strokeWidth="2" />
          <line x1="30" y1="120" x2="50" y2="120" stroke="white" strokeOpacity="0.8" strokeWidth="2" />
        </svg>

        {/* Игроки (пересчёт ландшафтных процентов -> портрет) */}
        {(data?.players || []).map((pl) => {
          const { xPct, yPct } = posToXY(pl.position, side);
          const left = yPct;      // горизонтальная ширина <- Y
          const top = 100 - xPct; // глубина поля (чем ближе к чужим воротам, тем ниже)

          return (
            <div
              key={pl.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%`, top: `${top}%` }}
              title={`${pl.name} — ${pl.position ?? ""}`}
            >
              <div className="grid place-items-center">
                <div className="w-12 h-12 rounded-full bg-white/90 shadow ring-2 ring-black/10 overflow-hidden grid place-items-center">
                  <Silhouette />
                </div>
                <div className="mt-1 px-2 py-0.5 rounded text-xs bg-black/40 text-white backdrop-blur">
                  {pl.jersey ?? "—"} • {shortName(pl.name)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
