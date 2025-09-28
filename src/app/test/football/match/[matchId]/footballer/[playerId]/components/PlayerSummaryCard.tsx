"use client";

import React, { useMemo } from "react";
import StatItem from "./StatItem";
import { fxg, pct } from "../utils/format";
import type { PlayerAccum } from "../../../../../types/statsbomb";

/**
 * Вспомогалки внутри компонента (чтобы не плодить внешние зависимости)
 */
function clamp(v: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, v));
}
function per90(v: number, minutes: number) {
  return minutes > 0 ? (v * 90) / minutes : 0;
}
function pctNum(a: number, b: number) {
  return b > 0 ? (a / b) * 100 : 0;
}

/** Гладкая мини-полоска прогресса */
function MiniBar({
  value, // 0..100
  title,
  from = "from-emerald-600",
  to = "to-sky-500",
}: {
  value: number;
  title?: string;
  from?: string;
  to?: string;
}) {
  const w = clamp(value);
  return (
    <div className="w-full">
      {title && (
        <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">{title}</div>
      )}
      <div className="h-2 w-full rounded-full bg-neutral-200/80 dark:bg-neutral-800/80 overflow-hidden">
        <div
          className={`h-2 bg-gradient-to-r ${from} ${to} transition-[width]`}
          style={{ width: `${w}%` }}
          aria-valuenow={w}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
}

/** Компактная «плашка-чип» */
function Chip({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      className="
        rounded-xl border border-neutral-200 dark:border-neutral-800
        bg-neutral-50 dark:bg-neutral-900/60
        px-3 py-2 text-sm
      "
    >
      <div className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-0.5 font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{sub}</div>
      )}
    </div>
  );
}

export default function PlayerSummaryCard({
  playerName,
  teamName,
  acc,
}: {
  playerName: string | null;
  teamName: string | null;
  acc: PlayerAccum;
}) {
  const name = playerName || "Игрок";
  const team = teamName || "Команда неизвестна";

  // ---- производные метрики ----
  const {
    minutes,
    goals,
    shotsTotal,
    shotsOnTarget,
    xG,
    keyPasses,
    assists,
    passesTotal,
    passesComplete,
    dribblesAttempted,
    dribblesComplete,
    duelsTotal,
    duelsWon,
    tackles,
    tacklesWon,
    interceptions,
    blocks,
    pressures,
    recoveries,
    clearances,
    losses,
    passesIntoFinalThird,
    carriesIntoFinalThird,
    entriesPenaltyArea,
    carriesIntoBox,
    progressivePasses,
    progressiveCarries,
    pensTaken,
    pensScored,
  } = acc;

  const m = Math.max(0, minutes || 0);

  // эффективность/качество
  const passAcc = pctNum(passesComplete, passesTotal);
  const sotPct = pctNum(shotsOnTarget, shotsTotal);
  const drbSucc = pctNum(dribblesComplete, dribblesAttempted);
  const duelWin = pctNum(duelsWon, duelsTotal);
  const tackWin = pctNum(tacklesWon, tackles);

  // интенсивность per90
  const xG90 = per90(xG, m);
  const sh90 = per90(shotsTotal, m);
  const kp90 = per90(keyPasses, m);
  const ast90 = per90(assists, m);
  const progA90 = per90(progressivePasses + progressiveCarries, m);
  const boxEnt90 = per90(entriesPenaltyArea + carriesIntoBox, m);
  const thirdEnt90 = per90(passesIntoFinalThird + carriesIntoFinalThird, m);
  const defAct90 = per90(
    tackles + interceptions + blocks + pressures + recoveries + clearances,
    m
  );
  const losses90 = per90(losses, m);

  // сводные индексы профиля (простые нормировки под «типичные максимумы»)
  const attackIdx = clamp(
    (xG90 / 1.2) * 30 +
      (per90(goals, m) / 1.0) * 35 +
      (kp90 / 3.0) * 20 +
      (sotPct / 70) * 15,
    0,
    100
  );
  const progressIdx = clamp(
    (progA90 / 12) * 55 + (boxEnt90 / 5) * 25 + (thirdEnt90 / 10) * 20,
    0,
    100
  );
  const defenseIdx = clamp(
    (defAct90 / 25) * 65 + (duelWin / 65) * 25 - (losses90 / 6) * 15,
    0,
    100
  );

  const headline = useMemo(
    () => [
      { label: "Минуты", value: m },
      { label: "Голы", value: goals },
      { label: "Ассисты", value: assists },
      { label: "xG", value: fxg(xG) },
    ],
    [m, goals, assists, xG]
  );

  return (
    <section
      className="
        rounded-2xl overflow-hidden shadow-sm
        border border-neutral-200 dark:border-neutral-800
        bg-white dark:bg-neutral-900
      "
      aria-labelledby="player-summary-heading"
    >
      {/* Шапка */}
      <div
        className="
          px-6 py-6
          bg-gradient-to-r from-emerald-700 via-emerald-600 to-sky-600
          text-white
        "
      >
        <h2
          id="player-summary-heading"
          className="text-xl md:text-2xl font-semibold tracking-tight"
        >
          {name}
        </h2>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm/5 text-emerald-50/90">
          <span
            className="
              inline-flex items-center gap-2 px-2.5 py-1
              rounded-full bg-white/10 ring-1 ring-white/15
              backdrop-blur
            "
            title="Команда"
          >
            <span className="inline-block size-1.5 rounded-full bg-white/80" />
            <span className="font-medium">{team}</span>
          </span>

          {/* Быстрые KPI */}
          <div className="flex gap-2">
            {headline.map((h) => (
              <span
                key={h.label}
                className="
                  inline-flex items-center gap-1.5 px-2 py-1 rounded-lg
                  bg-white/10 ring-1 ring-white/15 text-white/95
                "
              >
                <span className="text-[11px] uppercase opacity-80">{h.label}</span>
                <span className="font-semibold">{h.value}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Разделитель */}
      <div className="h-px bg-neutral-200/80 dark:bg-neutral-800" />

      {/* Сводные индикаторы профиля */}
      <div className="px-6 pt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl p-4 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
          <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Атака
          </div>
          <MiniBar value={attackIdx} />
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-neutral-600 dark:text-neutral-300">
            <div>
              <div className="font-medium">{fxg(xG90)}</div>
              <div className="opacity-70">xG/90</div>
            </div>
            <div>
              <div className="font-medium">{pct(shotsOnTarget, shotsTotal)}</div>
              <div className="opacity-70">В створ %</div>
            </div>
            <div>
              <div className="font-medium">{kp90.toFixed(2)}</div>
              <div className="opacity-70">Кл. пас/90</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
          <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Прогрессия
          </div>
          <MiniBar value={progressIdx} from="from-sky-600" to="to-cyan-500" />
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-neutral-600 dark:text-neutral-300">
            <div>
              <div className="font-medium">{progA90.toFixed(2)}</div>
              <div className="opacity-70">Прогр. дейст./90</div>
            </div>
            <div>
              <div className="font-medium">{boxEnt90.toFixed(2)}</div>
              <div className="opacity-70">Входы в Шт. /90</div>
            </div>
            <div>
              <div className="font-medium">{thirdEnt90.toFixed(2)}</div>
              <div className="opacity-70">Вх. в 1/3 /90</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800">
          <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Оборона
          </div>
          <MiniBar value={defenseIdx} from="from-emerald-600" to="to-teal-500" />
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-neutral-600 dark:text-neutral-300">
            <div>
              <div className="font-medium">{defAct90.toFixed(2)}</div>
              <div className="opacity-70">Обор. дейст./90</div>
            </div>
            <div>
              <div className="font-medium">{pct(duelsWon, duelsTotal)}</div>
              <div className="opacity-70">Дуэли %</div>
            </div>
            <div>
              <div className="font-medium">{pct(tacklesWon, tackles)}</div>
              <div className="opacity-70">Отборы %</div>
            </div>
          </div>
        </div>
      </div>

      {/* Основная сетка статов */}
      <div
        className="
          p-6 grid gap-3
          grid-cols-2 md:grid-cols-3 lg:grid-cols-4
          text-neutral-900 dark:text-neutral-100
        "
      >
        <StatItem label="Минуты" value={m} />

        {/* Голы/удары */}
        <StatItem label="Голы" value={goals} />
        <StatItem
          label="Удары (в створ)"
          value={`${shotsTotal} (${shotsOnTarget})`}
          sub={`xG: ${fxg(xG)} • В створ: ${pct(shotsOnTarget, shotsTotal)}`}
        />
        <StatItem
          label="G/90 • xG/90"
          value={`${per90(goals, m).toFixed(2)} • ${fxg(xG90)}`}
          sub={`Удары/90: ${sh90.toFixed(2)}`}
        />

        {/* Пасы */}
        <StatItem
          label="Пасы (точность)"
          value={`${passesComplete}/${passesTotal}`}
          sub={`Точность: ${pct(passesComplete, passesTotal)}`}
        />
        <StatItem
          label="Ключ. пасы / ассисты"
          value={`${keyPasses} / ${assists}`}
          sub={`Кл./90: ${kp90.toFixed(2)} • Асс./90: ${ast90.toFixed(2)}`}
        />

        {/* Дриблинг / Дуэли */}
        <StatItem
          label="Дриблинг (успешн.)"
          value={`${dribblesComplete}/${dribblesAttempted}`}
          sub={`Успех: ${pct(dribblesComplete, dribblesAttempted)}`}
        />
        <StatItem
          label="Дуэли (выигр.)"
          value={`${duelsWon}/${duelsTotal}`}
          sub={`Успех: ${pct(duelsWon, duelsTotal)}`}
        />

        {/* Прогрессия и входы */}
        <StatItem
          label="В финальную треть"
          value={`${passesIntoFinalThird} / ${carriesIntoFinalThird}`}
          sub="пасы / переносы"
        />
        <StatItem
          label="В штрафную"
          value={`${entriesPenaltyArea} / ${carriesIntoBox}`}
          sub="пасы / переносы"
        />
        <StatItem
          label="Прогрессия"
          value={`${progressivePasses} / ${progressiveCarries}`}
          sub={`Σ/90: ${progA90.toFixed(2)}`}
        />

        {/* Оборона и дисциплина */}
        <StatItem
          label="Перехв. / блоки"
          value={`${interceptions} / ${blocks}`}
          sub={`Обор. дейст./90: ${defAct90.toFixed(2)}`}
        />
        <StatItem
          label="Прессинги / потери"
          value={`${pressures} / ${losses}`}
          sub={`Потери/90: ${losses90.toFixed(2)}`}
        />
        <StatItem
          label="Фолы (сов./против)"
          value={`${acc.foulsCommitted} / ${acc.foulsWon}`}
        />
        <StatItem
          label="Карточки"
          value={`${acc.yellow} жёлт. / ${acc.red} красн.`}
          sub={pensTaken ? `Пенальти: ${pensScored}/${pensTaken}` : undefined}
        />
      </div>

      {/* Низ — компактные чипы с ключевыми % */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Chip label="Точн. паса" value={pct(passesComplete, passesTotal)} />
          <Chip label="В створ" value={pct(shotsOnTarget, shotsTotal)} />
          <Chip label="Дриблинг %" value={pct(dribblesComplete, dribblesAttempted)} />
          <Chip label="Дуэли %" value={pct(duelsWon, duelsTotal)} />
          <Chip label="Отборы %" value={pct(tacklesWon, tackles)} />
        </div>
      </div>
    </section>
  );
}
