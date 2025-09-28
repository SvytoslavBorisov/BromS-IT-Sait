"use client";

import React, { useMemo } from "react";
import MiniPlayerCard from "./players/MiniPlayerCard";
import { groupByPosition, type PosGroup } from "./utils/positions";

// Типы входных данных — подгони под свои, важно чтобы у p были { playerId, playerName, position, minutes, ... }
export type PlayerAccumLike = {
  playerId: number | string;
  playerName?: string;
  teamName?: string;
  position?: string;
  minutes?: number;

  // Голы и удары
  goals?: number;
  shotsTotal?: number;
  shotsOnTarget?: number;
  xG?: number | null;

  // Пасы
  passesTotal?: number;
  passesComplete?: number;
  keyPasses?: number;
  assists?: number;

  // Дриблинг
  dribblesAttempted?: number;
  dribblesComplete?: number;

  // Дуэли
  duelsTotal?: number;
  duelsWon?: number;

  // (если вдруг пригодятся доп. показатели)
  pensScored?: number;
  pensTaken?: number;
  crosses?: number;
  crossesComplete?: number;
  longPasses?: number;
  throughBalls?: number;
  switches?: number;
  passesIntoFinalThird?: number;
  carriesIntoFinalThird?: number;
  entriesPenaltyArea?: number;
  carriesIntoBox?: number;
  progressivePasses?: number;
  progressiveCarries?: number;
  tackles?: number;
  tacklesWon?: number;
  interceptions?: number;
  blocks?: number;
  pressures?: number;
  foulsCommitted?: number;
  foulsWon?: number;
  yellow?: number;
  red?: number;
  recoveries?: number;
  clearances?: number;
  offsides?: number;
  underPressureEvents?: number;
  losses?: number;
};

// Простое распределение по линиям на основе position: GK / DEF / MID / FWD, остальное -> Bench
export function TeamBoard({
  teamId,
  teams,
  matchId,
  teamName,
}: {
  teamId: number | string;
  teams: Map<number | string, PlayerAccumLike[]>;
  matchId: string | number;
  teamName?: string | null;
}) {
  const roster = teams.get(teamId) || [];

  const groups = useMemo(() => {
    const by: Record<PosGroup, PlayerAccumLike[]> = {
      GK: [], DEF: [], MID: [], FWD: [], Bench: [],
    };
    for (const p of roster) {
      by[groupByPosition(p.position)].push(p);
    }

    // лёгкая сортировка внутри группы: сначала по минутам (desc), потом по имени
    for (const k of Object.keys(by) as PosGroup[]) {
      by[k].sort((a, b) => {
        const ma = a.minutes ?? 0, mb = b.minutes ?? 0;
        if (mb !== ma) return mb - ma;
        return String(a.playerName ?? "").localeCompare(String(b.playerName ?? ""), "ru");
      });
    }
    return by;
  }, [roster]);

  const Section = ({ title, arr }: { title: string; arr: PlayerAccumLike[] }) => (
    <section className="mb-8">
      <h3 className="mb-3 text-lg font-semibold text-neutral-700">{title}</h3>
      {arr.length === 0 ? (
        <div className="text-sm text-neutral-500">—</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {arr.map((p) => (
            <MiniPlayerCard
              key={`${teamId}:${p.playerId}`}
              p={p as any}
              matchId={matchId}
              teamName={teamName}
            />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="rounded-2xl bg-white/60 p-4 sm:p-5">
      <Section title="Goalkeeper" arr={groups.GK} />
      <Section title="Defenders"   arr={groups.DEF} />
      <Section title="Midfielders" arr={groups.MID} />
      <Section title="Forwards"    arr={groups.FWD} />
      <Section title="Bench / Other" arr={groups.Bench} />
    </div>
  );
}