"use client";
import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import type { TeamLineup } from "../lib/positions";
import { useMatchEvents } from "./[matchId]/footballer/[playerId]/hooks/useMatchEvents";

import type { Pair, MatchSummaryProps, SBEvent } from "./summary/types";
import {
  format1,
  isCompletedPass,
  isFoul,
  isOnTarget,
  normalizeXG,
  cardType,
} from "./summary/utils";
import { SummaryHeader } from "./summary/components/Header";
import { Scoreboard } from "./summary/components/Scoreboard";
import { StatRow } from "./summary/components/StatRow";
import { SummarySkeleton } from "./summary/components/Skeleton";

/**
 * Внешний проп-тип разворачиваем явно, чтобы иметь дружелюбные подсказки.
 */
export function MatchSummaryPanel(props: MatchSummaryProps) {
  const { left, right, leftId, rightId, leftLabel, rightLabel } = props as {
    left?: TeamLineup;
    right?: TeamLineup;
    leftId?: number;
    rightId?: number;
    leftLabel?: string;
    rightLabel?: string;
  };

  const params = useParams() as { matchId?: string } | undefined;
  const matchId = params?.matchId ?? ""; // хук требует string

  const { data, error, loading } = useMatchEvents(matchId);
  const events = data ?? [];

  const teamMeta = useMemo(
    () => ({
      leftId,
      rightId,
      leftName: leftLabel ?? (left ? "Team A" : "Team A"),
      rightName: rightLabel ?? (right ? "Team B" : "Team B"),
    }),
    [left, right, leftId, rightId, leftLabel, rightLabel]
  );

  const stats = useMemo(() => {
    const init = {
      goals: { left: 0, right: 0 } as Pair,
      xg: { left: 0, right: 0 } as Pair,
      shots: { left: 0, right: 0 } as Pair,
      sot: { left: 0, right: 0 } as Pair,
      passCompleted: { left: 0, right: 0 } as Pair,
      passTotal: { left: 0, right: 0 } as Pair,
      fouls: { left: 0, right: 0 } as Pair,
      yc: { left: 0, right: 0 } as Pair,
      rc: { left: 0, right: 0 } as Pair,
    };

    if (!Array.isArray(events)) return init;

    const L = teamMeta.leftId;
    const R = teamMeta.rightId;

    for (const e of events as SBEvent[]) {
      const tid = e.team?.id;
      const side = tid != null && (tid === L ? "left" : tid === R ? "right" : undefined);
      if (!side) continue;

      const t = init as any;

      // Shots / Goals / xG
      if (e.type?.name === "Shot" || (e as any).shot) {
        t.shots[side] += 1;
        t.xg[side] += normalizeXG(e);
        if (isOnTarget(e)) t.sot[side] += 1;
        const out = e.shot?.outcome?.name?.toLowerCase();
        if (out === "goal" || (e.shot as any)?.is_goal) t.goals[side] += 1;
      }

      // Passes
      if (e.type?.name === "Pass" || (e as any).pass) {
        t.passTotal[side] += 1;
        if (isCompletedPass(e)) t.passCompleted[side] += 1;
      }

      // Fouls
      if (isFoul(e)) {
        t.fouls[side] += 1;
      }

      // Cards
      const ct = cardType(e);
      if (ct === "yellow") t.yc[side] += 1;
      if (ct === "red") t.rc[side] += 1;
    }

    return init;
  }, [events, teamMeta.leftId, teamMeta.rightId]);

  const passAccLeft =
    stats.passTotal.left > 0 ? (stats.passCompleted.left / stats.passTotal.left) * 100 : 0;
  const passAccRight =
    stats.passTotal.right > 0 ? (stats.passCompleted.right / stats.passTotal.right) * 100 : 0;

  const possession: Pair = {
    left: stats.passTotal.left,
    right: stats.passTotal.right,
  };

  if (error) {
    return (
      <div className="text-sm text-red-600 dark:text-red-400">
        Не удалось загрузить события матча: {String(error)}
      </div>
    );
  }

  if (loading) {
    return <SummarySkeleton />;
  }

  const haveEvents = Array.isArray(events) && events.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <SummaryHeader leftName={teamMeta.leftName} rightName={teamMeta.rightName} />

      {!haveEvents || teamMeta.leftId == null || teamMeta.rightId == null ? (
        <div className="text-sm text-neutral-600 dark:text-neutral-300">
          События матча недоступны или не удалось сопоставить id команд.
          Загрузите events.json с корректными team.id либо откройте матч через API.
        </div>
      ) : (
        <>
          {/* Крупное табло + xG */}
          <Scoreboard goals={stats.goals} xg={stats.xg} />

          {/* Сетка карточек-метрик */}
          <div className="grid grid-cols-2 gap-3">
            <StatRow title="Удары" pair={stats.shots} />
            <StatRow title="В створ" pair={stats.sot} />
            <StatRow
              title="Точность паса (%)"
              pair={{ left: passAccLeft, right: passAccRight }}
              fmt={(v) => `${format1(v)}%`}
            />
            <StatRow title="«Владение» (по пасам)" pair={possession} />
            <StatRow title="Фолы" pair={stats.fouls} />
            <StatRow title="Жёлтые карточки" pair={stats.yc} />
            <StatRow title="Красные карточки" pair={stats.rc} />
          </div>
        </>
      )}
    </div>
  );
}
