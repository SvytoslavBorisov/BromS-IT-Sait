"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useMatchEvents } from "./hooks/useMatchEvents";
import Section from "./components/Section";
import { LoadingState, ErrorState } from "./components/States";
import TimelinePanel from "./components/TimelinePanel";
import PlayerSummaryCard from "./components/PlayerSummaryCard";

import { usePlayerPasses } from "./hooks/usePlayerPasses";
import PassMapPanel from "./components/PassMapPanel";

import { aggregate } from "../../../../lib/aggregate";
import type { SBEvent, PlayerAccum } from "../../../../types/statsbomb";

export default function PlayerInMatchClient({
  matchId,
  playerId,
}: {
  matchId: string;
  playerId: string;
}) {
  const { data: raw, loading, error } = useMatchEvents(matchId);

  const numPlayerId = useMemo(() => {
    const n = Number(playerId);
    return Number.isFinite(n) ? n : null;
  }, [playerId]);

  const { acc, teamName, playerName } = useMemo(() => {
    if (!raw) return { acc: null as PlayerAccum | null, teamName: null as string | null, playerName: null as string | null };

    const { byTeam, lineups } = aggregate(raw as SBEvent[], { sortKey: "minutes", sortDir: "desc", query: "" });

    // 1) Пытаемся найти команду игрока по лайнапам (в lineup у игрока поле id)
    let teamIdOfPlayer: number | null = null;
    for (const [tid, lu] of lineups.entries()) {
      const found = lu.players?.some(p => {
        const pid = p.id;
        return numPlayerId !== null ? pid === numPlayerId : String(pid) === playerId;
      });
      if (found) { teamIdOfPlayer = tid; break; }
    }

    // 2) Если не получилось — смотрим по агрегату
    if (teamIdOfPlayer == null) {
      for (const [tid, list] of byTeam.entries()) {
        if (list.some(p => (numPlayerId !== null ? p.playerId === numPlayerId : String(p.playerId) === playerId))) {
          teamIdOfPlayer = tid;
          break;
        }
      }
    }

    if (teamIdOfPlayer == null) return { acc: null, teamName: null, playerName: null };

    const list = (byTeam.get(teamIdOfPlayer) ?? []) as PlayerAccum[];
    const found = list.find(p => (numPlayerId !== null ? p.playerId === numPlayerId : String(p.playerId) === playerId)) || null;

    return {
      acc: found,
      teamName: found?.teamName ?? lineups.get(teamIdOfPlayer)?.teamName ?? null,
      playerName: found?.playerName ?? null
    };
  }, [raw, playerId, numPlayerId]);

  const timeline = useMemo(() => {
    if (!raw || (!numPlayerId && !playerId)) return [];
    const pidStr = String(numPlayerId ?? playerId);
    const interesting = new Set([
      "Shot", "Pass", "Ball Receipt*", "Carry", "Dribble", "Duel",
      "Foul Committed", "Foul Won", "Bad Behaviour", "Substitution",
      "Miscontrol", "Interception", "Clearance", "Goal Keeper", "Block", "Pressure"
    ]);
    return (raw as SBEvent[])
      .filter(ev => ev?.player?.id != null && String(ev.player.id) === pidStr && ev?.type?.name && interesting.has(ev.type.name))
      .map(ev => ({
        minute: ev.minute ?? 0,
        second: ev.second ?? 0,
        type: ev.type?.name ?? "",
        outcome:
          (ev.shot?.outcome?.name ||
           ev.pass?.outcome?.name ||
           ev.dribble?.outcome?.name ||
           ev.duel?.outcome?.name ||
           ev.goalkeeper?.type?.name ||
           ev.bad_behaviour?.card?.name ||
           "") as string,
        to: ev.pass?.recipient?.name || ev.substitution?.replacement?.name || "",
        position: ev.position?.name || "",
      }))
      .sort((a, b) => (a.minute === b.minute ? a.second - b.second : a.minute - b.minute));
  }, [raw, numPlayerId, playerId]);

  const { passes, flipped } = usePlayerPasses(raw as SBEvent[] | null, numPlayerId ?? playerId, true);

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState text={error} />;
  if (!acc)    return <ErrorState text="Игрок не найден в этом матче." />;

  return (
    <div className="space-y-8">
      <PlayerSummaryCard playerName={playerName} teamName={teamName} acc={acc} />

      {/* Карта передач игрока */}
      <PassMapPanel passes={passes} flipped={flipped} />

      {/* Твой таймлайн как раньше */}
      <TimelinePanel items={timeline} />

      <div className="text-sm">
        Перейти в профиль игрока:{" "}
        <Link href={`/test/football/footballer/${encodeURIComponent(playerId)}`} className="text-sky-700 hover:underline">
          /test/football/footballer/{encodeURIComponent(playerId)}
        </Link>
      </div>
    </div>
  );
}
