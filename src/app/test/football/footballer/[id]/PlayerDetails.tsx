'use client';

import Link from "next/link";
import { useEffect, useState } from 'react';

type AnyObj = Record<string, any>;

export default function PlayerDetails({ id }: { id: string }) {
  const [data, setData] = useState<AnyObj | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cleanId = (id ?? '').trim();
    if (!cleanId) { setErr('Пустой id'); setLoading(false); return; }

    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true); setErr(null); setData(null);
        const res = await fetch(`/api/football/players/${encodeURIComponent(cleanId)}`, {
          cache: 'no-store', signal: ac.signal
        });
        if (ac.signal.aborted) return;
        if (res.status === 404) { setErr('Игрок не найден'); setLoading(false); return; }
        if (!res.ok) { setErr(`Ошибка сервера: ${res.status}`); setLoading(false); return; }
        const json = await res.json();
        if (!ac.signal.aborted) { setData(json ?? null); setLoading(false); }
      } catch (e: any) {
        if (!ac.signal.aborted) { setErr(e?.message || 'Ошибка сети'); setLoading(false); }
      }
    })();
    return () => ac.abort();
  }, [id]);

  if (loading) return <div className="text-sm text-neutral-500">Загрузка…</div>;
  if (err)     return <div className="text-sm text-red-600">Ошибка: {err}</div>;
  if (!data)   return <div className="text-sm text-neutral-500">Нет данных</div>;

  const p = data;
  const num = (v: any, d = 2) => Number.isFinite(Number(v)) ? Number(v).toFixed(d) : '—';
  const int = (v: any) => Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0;

  // --- нормализуем список матчей из разных возможных полей ---
  type MatchLite = { id: string | number; date?: string; comp?: string; home?: string; away?: string; minutes?: number };
  let matches: MatchLite[] = [];

  const rawMatches = Array.isArray(p.matches) ? p.matches
                    : Array.isArray(p.games) ? p.games
                    : Array.isArray(p.appearances) ? p.appearances
                    : null;

  if (rawMatches) {
    matches = rawMatches.map((m: any) => ({
      id: m.id ?? m.match_id ?? m.mid ?? m.game_id ?? m.matchId,
      date: m.date ?? m.kickoff_time ?? m.utc_date,
      comp: m.competition ?? m.tournament ?? m.league,
      home: m.home ?? m.home_team ?? m.homeTeam?.name,
      away: m.away ?? m.away_team ?? m.awayTeam?.name,
      minutes: m.minutes ?? m.mins ?? m.time_played
    })).filter((m: MatchLite) => m.id != null);
  } else if (Array.isArray(p.match_ids)) {
    matches = p.match_ids.map((mid: any) => ({ id: mid }));
  }

  return (
    <div className="space-y-6">
      {/* Верхний блок */}
      <div className="text-neutral-500">
        ID: <b>{String(p.id)}</b> · Клуб: <b>{p.club ?? '—'}</b> · Позиция: <b>{p.position ?? '—'}</b> ·
        {' '}Матчей: <b>{p.matches_count ?? (matches?.length ?? 0)}</b> · Минут: <b>{int(p.minutes_sum)}</b>
      </div>

      {/* Статы */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-xl p-4">
          <h2 className="font-medium mb-2">Голы/удары/xG</h2>
          <ul className="text-sm space-y-1">
            <li>Голы: <b>{p.goals_sum ?? 0}</b> ({num(p.goals_per90)}/90)</li>
            <li>Удары: <b>{p.shots_sum ?? 0}</b> ({num(p.shots_per90)}/90)</li>
            <li>xG: <b>{num(p.xg_sum)}</b> ({num(p.xg_per90)}/90)</li>
          </ul>
        </div>

        <div className="border rounded-xl p-4">
          <h2 className="font-medium mb-2">Пасы</h2>
          <ul className="text-sm space-y-1">
            <li>Пасы (att/cmp): <b>{p.passes_att_sum ?? 0}</b> / <b>{p.passes_cmp_sum ?? 0}</b> ({num(p.pass_completion_pct)}%)</li>
            <li>Ключевые пасы: <b>{p.key_passes_sum ?? 0}</b> ({num(p.key_passes_per90)}/90)</li>
            <li>Ассисты: <b>{p.assists_sum ?? 0}</b> · xA: <b>{num(p.xa_sum)}</b> ({num(p.xa_per90)}/90)</li>
            <li>В финальную треть: <b>{p.passes_final_third_sum ?? 0}</b> · В штрафную: <b>{p.passes_into_box_sum ?? 0}</b></li>
            <li>Прогрессивные пасы: <b>{p.progressive_passes_sum ?? 0}</b></li>
            <li>Кроссы/Свитчи/Сквозные/Катбэки: <b>{p.crosses_sum ?? 0}</b>/<b>{p.switches_sum ?? 0}</b>/<b>{p.through_balls_sum ?? 0}</b>/<b>{p.cutbacks_sum ?? 0}</b></li>
            <li>Длины (S/M/L): <b>{p.passes_short_sum ?? 0}</b>/<b>{p.passes_medium_sum ?? 0}</b>/<b>{p.passes_long_sum ?? 0}</b></li>
          </ul>
        </div>

        <div className="border rounded-xl p-4">
          <h2 className="font-medium mb-2">Владение/переносы</h2>
          <ul className="text-sm space-y-1">
            <li>Приёмы мяча: <b>{p.ball_receipts_sum ?? 0}</b></li>
            <li>Переносы: <b>{p.carries_sum ?? 0}</b> · Дистанция: <b>{num(p.carries_distance_sum)}</b></li>
            <li>Прогрессивные переносы: <b>{p.progressive_carries_sum ?? 0}</b></li>
          </ul>
        </div>

        <div className="border rounded-xl p-4">
          <h2 className="font-medium mb-2">Оборона/единоборства</h2>
          <ul className="text-sm space-y-1">
            <li>Давления: <b>{p.pressures_sum ?? 0}</b></li>
            <li>Отборы/Перехваты/Выносы: <b>{p.tackles_sum ?? 0}</b>/<b>{p.interceptions_sum ?? 0}</b>/<b>{p.clearances_sum ?? 0}</b></li>
            <li>Дриблинги (усп.): <b>{p.dribbles_sum ?? 0}</b> (<b>{p.dribbles_complete_sum ?? 0}</b>) · Успешн.: {num(p.dribbles_success_pct)}%</li>
            <li>Дуэли (победы): <b>{p.duels_sum ?? 0}</b> (<b>{p.duels_won_sum ?? 0}</b>) · Win%: {num(p.duels_win_pct)}%</li>
            <li>Фолы (соверш./на нём): <b>{p.fouls_committed_sum ?? 0}</b>/<b>{p.fouls_won_sum ?? 0}</b></li>
          </ul>
        </div>
      </section>

      {/* --- НИЖНИЙ БЛОК: список матчей --- */}
      <section className="border rounded-xl p-4">
        <h2 className="font-medium mb-3">Матчи</h2>

        {!matches?.length && (
          <div className="text-sm text-neutral-500">Нет данных о матчах</div>
        )}

        {!!matches?.length && (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {matches.map((m) => {
              const mid = String(m.id);
              return (
                <li key={mid} className="py-2 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm">
                      <Link
                        href={`/test/football/match/${encodeURIComponent(mid)}`}
                        className="font-medium hover:underline"
                      >
                        Матч #{mid}
                      </Link>
                      {m.date && <span className="text-neutral-500"> · {m.date}</span>}
                      {m.comp && <span className="text-neutral-500"> · {m.comp}</span>}
                    </div>
                    {(m.home || m.away) && (
                      <div className="text-xs text-neutral-500 truncate">
                        {m.home ?? "—"} vs {m.away ?? "—"}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-neutral-600">
                    Минут: <b>{int(m.minutes)}</b>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* сырой JSON по желанию */}
      <details className="border rounded-xl p-4">
        <summary className="cursor-pointer">Показать сырой JSON</summary>
        <pre className="text-xs overflow-auto p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
{JSON.stringify(p, null, 2)}
        </pre>
      </details>
    </div>
  );
}
