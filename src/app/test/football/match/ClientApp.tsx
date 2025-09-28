"use client";

import React, { useEffect, useMemo, useState } from "react";
import { TeamTabs } from "../components/TeamTabs";
import { TeamBoard } from "../components/TeamBoard";
import { TeamLineupTab } from "../components/TeamLineupTab";
import { useStatsbomb } from "../hooks/useStatsbomb";
import { csvJoin } from "../lib/utils";

type View = "stats" | "lineups";

export default function ClientApp({ matchId }: { matchId?: string }) {
  const [raw, setRaw] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>("minutes");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<View>("stats");

  const { teams, teamsOrder, formations, lineups, exportRows } = useStatsbomb(
    raw,
    { sortKey, sortDir, query }
  );

  // === Автозагрузка JSON матча по id ===
  useEffect(() => {
    const id = (matchId ?? "").trim();
    if (!id) {
      setError("Пустой id матча");
      setRaw(null);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setRaw(null);
        const res = await fetch(`/api/football/matches/${encodeURIComponent(id)}`, {
          cache: "no-store",
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        if (res.status === 404) {
          setError("Матч не найден");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError(`Ошибка сервера: ${res.status}`);
          setLoading(false);
          return;
        }
        const js = await res.json();
        if (!Array.isArray(js)) {
          setError("Ожидался массив событий StatsBomb");
          setLoading(false);
          return;
        }
        setRaw(js);
        setLoading(false);
      } catch (e: any) {
        if (!ac.signal.aborted) {
          setError(e?.message || "Ошибка сети");
          setLoading(false);
        }
      }
    })();
    return () => ac.abort();
  }, [matchId]);

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
    a.download = `match_${(matchId || "local")}_player_stats.csv`;
    a.click();
  }

  // matchId для дочерних: всегда определён
  const mid: string | number = useMemo(
    () => (matchId && matchId.trim() ? matchId.trim() : "local"),
    [matchId]
  );

  return (
    <main className="max-w-8xl mx-auto px-4 md:px-8 py-6">
      {/* Верхняя панель (поиск/сорт/экспорт) */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по игроку/команде"
          className="px-3 py-2 rounded-md border border-neutral-200 bg-white"
        />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          className="px-3 py-2 rounded-md border border-neutral-200 bg-white"
        >
          <option value="minutes">Минуты</option>
          <option value="goals">Голы</option>
          <option value="xg">xG</option>
          <option value="assists">Ассисты</option>
          <option value="passes">Пасы</option>
        </select>
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
          className="px-3 py-2 rounded-md border border-neutral-200 bg-white"
        >
          <option value="desc">По убыв.</option>
          <option value="asc">По возр.</option>
        </select>
        <button
          onClick={exportCSV}
          className="px-4 py-2 rounded-md border border-neutral-200 bg-white text-neutral-800 disabled:opacity-50"
          disabled={!exportRows.length}
        >
          Экспорт CSV
        </button>
      </div>

      {loading && <div className="p-3 text-sm text-neutral-500">Загрузка матча…</div>}
      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">{error}</div>
      )}
      {!loading && !error && !raw && (
        <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-neutral-600">Нет данных</div>
      )}

      {raw && (
        <>
          {/* Вкладки (светлые, без dark:) */}
          <div className="mb-4 flex gap-2">
            {(["stats","lineups"] as View[]).map((v) => {
              const is = view === v;
              const label = v === "stats" ? "Статистика" : "Схемы команд";
              const icon = v === "stats" ? "📊" : "🗺️";
              const cls = is
                ? "px-3 py-2 rounded-xl font-medium flex items-center gap-2 border bg-white text-sky-700 border-sky-200 shadow-sm"
                : "px-3 py-2 rounded-xl font-medium flex items-center gap-2 border bg-neutral-100 text-neutral-800 border-neutral-200 hover:bg-neutral-200";
              return (
                <button key={v} onClick={() => setView(v)} className={cls}>
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Контент вкладок */}
          {view === "stats" ? (
            <TeamTabs teams={teams} teamsOrder={teamsOrder} formations={formations}>
              {(teamId: number) => {
                // TeamTabs гарантирует number — работаем строго с number
                const tid = teamId;

                // Map ключи — number → никаких union `string | number`
                const lu = lineups.get(tid) as { teamName?: string } | undefined;
                const fm = formations.get(tid) as { teamName?: string } | undefined;
                const teamName = lu?.teamName ?? fm?.teamName ?? undefined;

                return (
                  <TeamBoard
                    teamId={tid}
                    teams={teams}
                    matchId={mid}
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
