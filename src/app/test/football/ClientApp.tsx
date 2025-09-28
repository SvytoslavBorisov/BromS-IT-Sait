"use client";

import React, { useMemo, useRef, useState } from "react";
import { Toolbar } from "./components/Toolbar";
import { TeamTabs } from "./components/TeamTabs";
import { TeamBoard } from "./components/TeamBoard";
import { TeamLineupTab } from "./components/TeamLineupTab";
import { EmptyState } from "./components/EmptyState";
import { useStatsbomb } from "./hooks/useStatsbomb";
import { csvJoin } from "./lib/utils";

type View = "stats" | "lineups";

export default function ClientApp() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>("minutes");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<View>("stats"); // ← НОВОЕ

  const { teams, teamsOrder, formations, lineups, exportRows } = useStatsbomb(raw, { sortKey, sortDir, query });

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const js = JSON.parse(String(reader.result || "[]"));
        if (!Array.isArray(js)) throw new Error("Ожидался массив событий StatsBomb");
        setRaw(js);
      } catch (err: any) {
        setError("Не удалось прочитать JSON: " + err.message);
      }
    };
    reader.readAsText(f, "utf-8");
  }

  function reset() {
    setRaw(null); setError(null); setQuery(""); if (fileRef.current) fileRef.current.value = "";
  }

  function exportCSV() {
    if (!exportRows.length) return;
    const header = [
      "team","player","position","minutes",
      "passes_total","passes_complete","key_passes","assists","crosses","crosses_complete","long_passes","through_balls","switches",
      "shots_total","shots_on","goals","xg","pens_taken","pens_scored",
      "dribbles_att","dribbles_succ","carries","carry_dist","receptions",
      "duels_total","duels_won","tackles","tackles_won","interceptions","blocks","pressures",
      "fouls_committed","fouls_won","yellow","red","recoveries","clearances","offsides","under_pressure","losses",
      "passes_into_final_third","carries_into_final_third","entries_box_pass","carries_into_box","progressive_passes","progressive_carries"
    ];
    const csv = [header, ...exportRows].map(csvJoin).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "match_player_stats.csv";
    a.click();
  }

  return (
    <main className="max-w-8xl mx-auto px-4 md:px-8 py-6">
      <Toolbar
        fileRef={fileRef}
        onFile={onFile}
        onReset={reset}
        onExport={exportCSV}
        query={query}
        setQuery={setQuery}
        sortKey={sortKey}
        setSortKey={setSortKey}
        sortDir={sortDir}
        setSortDir={setSortDir}
        disabled={!raw}
      />

      {!!error && (
        <div className="p-4 rounded-xl bg-red-100 text-red-800 border border-red-300">{error}</div>
      )}

      {!raw && !error && <EmptyState />}

      {raw && (
        <>
          {/* ВЕРХНИЕ ВКЛАДКИ СОДЕРЖИМОГО */}
          <div className="mb-4 flex gap-2">
            {(["stats","lineups"] as View[]).map(v => {
              const is = view === v;
              const label = v === "stats" ? "Статистика" : "Схемы команд";
              const icon = v === "stats" ? "📊" : "🗺️";
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={(is ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100")
                    + " px-3 py-2 rounded-xl font-medium flex items-center gap-2"}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* КОНТЕНТ ВКЛАДОК */}
          {view === "stats" ? (
            <TeamTabs teams={teams} teamsOrder={teamsOrder} formations={formations}>
              {(teamId: number) => {
                // аккуратно достаём название команды из lineups (если есть)
                const teamName =
                  lineups.get(teamId)?.teamName ??
                  formations.get(teamId)?.teamName ??
                  null;

                // здесь РАНЬШЕ были несуществующие переменные (homeId, byTeam, homeName)
                // теперь корректно: teamId, teams, matchId, teamName
                return (
                  <TeamBoard
                    teamId={teamId}
                    teams={teams}
                    matchId={matchId}
                    teamName={teamName}
                  />
                );
              }}
            </TeamTabs>
          ) : (
            <TeamLineupTab lineups={lineups} />
          )}
        </>
      )}
    </main>
  );
}
