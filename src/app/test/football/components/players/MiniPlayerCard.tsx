"use client";

import Link from "next/link";
import Metric from "@/app/test/football/components/ui/Metric";
import PlayerAvatar from "@/app/test/football/components/players/PlayerAvatar";
import type { PlayerAccum } from "@/app/test/football/types/statsbomb";

function pct(num?: number, den?: number) {
  if (!den) return "—";
  const v = Math.round(((num || 0) / den) * 100);
  return `${v}%`;
}
function fxg(x?: number | null) {
  const v = x ?? 0;
  return (Math.round(v * 1000) / 1000).toString();
}

export default function MiniPlayerCard({
  p,
  matchId,
  teamName,
}: {
  p: PlayerAccum;          // агрегат игрока за матч
  matchId: string | number;
  teamName?: string | null;
}) {
  const passAcc = pct(p.passesComplete, p.passesTotal);
  const dribAcc = pct(p.dribblesComplete, p.dribblesAttempted);
  const duelWin = pct(p.duelsWon, p.duelsTotal);

  const playerId = p.playerId ?? (p as any).id;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* Шапка */}
      <div className="flex items-center gap-4 border-b border-neutral-200 px-4 py-4">
        <PlayerAvatar name={p.playerName} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold text-neutral-900">{p.playerName || "Игрок"}</div>
          <div className="truncate text-sm text-neutral-500">
            {p.position || "—"} {teamName ? `· ${teamName}` : ""}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            ⏱ Минуты: <span className="font-semibold text-neutral-800">{p.minutes ?? 0}</span>
          </div>
        </div>
        {/* Кнопка-ссылка на страницу игрока в этом матче */}
        {playerId != null && (
          <Link
            href={`/test/football/match/${encodeURIComponent(String(matchId))}/footballer/${encodeURIComponent(String(playerId))}`}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100"
          >
            Статистика в матче →
          </Link>
        )}
      </div>

      {/* Ключевые метрики */}
      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-6">
        <Metric label="Голы" value={p.goals ?? 0} sub={`xG ${fxg(p.xG)}`} />
        <Metric label="Удары (в створ)" value={`${p.shotsTotal ?? 0} (${p.shotsOnTarget ?? 0})`} />
        <Metric label="Пасы" value={`${p.passesComplete ?? 0}/${p.passesTotal ?? 0}`} sub={passAcc} />
        <Metric label="Ассисты / кей-пассы" value={`${p.assists ?? 0} / ${p.keyPasses ?? 0}`} />
        <Metric label="Дриблинг" value={`${p.dribblesComplete ?? 0}/${p.dribblesAttempted ?? 0}`} sub={dribAcc} />
        <Metric label="Дуэли" value={`${p.duelsWon ?? 0}/${p.duelsTotal ?? 0}`} sub={duelWin} />
      </div>
    </div>
  );
}
