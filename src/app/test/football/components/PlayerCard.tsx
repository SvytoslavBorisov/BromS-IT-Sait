"use client";
import React, { useState } from "react";
import { round, initials } from "../lib/utils";

type RowProps = { label: string; value: React.ReactNode; hint?: string };
const StatRow = ({ label, value, hint }: RowProps) => (
  <div className="flex items-start justify-between gap-4 py-1.5">
    <div className="text-sm text-neutral-600 dark:text-neutral-300">
      <span className="font-medium">{label}</span>
      {hint ? <span className="ml-2 text-xs text-neutral-500">({hint})</span> : null}
    </div>
    <div className="text-sm font-semibold text-neutral-900 dark:text-white">{value}</div>
  </div>
);

type SectionProps = {
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};
const Section = ({ title, icon, children, defaultOpen }: SectionProps) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between group"
      >
        <div className="flex items-center gap-2 text-left">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-neutral-900 dark:text-white">{title}</span>
        </div>
        <span
          className={
            "inline-block transition-transform text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 " +
            (open ? "rotate-90" : "")
          }
          aria-hidden
        >
          ▶
        </span>
      </button>
      <div
        className={
          "grid transition-[grid-template-rows] duration-300 ease-out " +
          (open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")
        }
      >
        <div className="overflow-hidden px-4 pb-3">{children}</div>
      </div>
    </div>
  );
};

// Встроенный SVG-силуэт (чтобы не тащить отдельный файл)
const Silhouette = () => (
  <svg viewBox="0 0 64 64" className="w-14 h-14 text-neutral-300 dark:text-neutral-600">
    <circle cx="32" cy="22" r="12" fill="currentColor" />
    <path
      d="M8 58c0-11 10-20 24-20s24 9 24 20"
      fill="currentColor"
    />
  </svg>
);

export function PlayerCard({ p }: { p: any }) {
  const accuracy = p.passesTotal ? Math.round((p.passesComplete / p.passesTotal) * 100) : 0;
  const duelWin = p.duelsTotal ? Math.round((p.duelsWon / p.duelsTotal) * 100) : 0;
  const dribSucc = p.dribblesAttempted ? Math.round((p.dribblesComplete / p.dribblesAttempted) * 100) : 0;

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-4">
        <div className="relative">
          <div className="overflow-hidden rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 w-16 h-16 grid place-items-center">
            <Silhouette />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-neutral-900 text-white text-xs px-1.5 py-0.5 rounded-md dark:bg-white dark:text-neutral-900">
            {initials(p.playerName)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate text-lg text-neutral-900 dark:text-white">
            {p.playerName}
          </div>
          <div className="text-sm text-neutral-500 truncate">{p.position || "—"}</div>
          <div className="mt-1 text-xs text-neutral-500">
            ⏱ Минуты на поле: <span className="font-semibold text-neutral-800 dark:text-neutral-300">{p.minutes ?? 0}</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-2xl">⚽️</span>
          <span className="text-2xl">🥅</span>
          <span className="text-2xl">📊</span>
        </div>
      </div>

      {/* Sections */}
      <div className="p-4 space-y-3">
        <Section title="Голы и удары" icon="⚽️" defaultOpen>
          <StatRow label="Голы" value={p.goals} />
          <StatRow label="Удары (всего / в створ)" value={`${p.shotsTotal} / ${p.shotsOnTarget}`} />
          <StatRow label="Ожидаемые голы (xG)" value={round(p.xG)} hint="качество моментов" />
          <StatRow label="Пенальти (забил/пробил)" value={`${p.pensScored}/${p.pensTaken}`} />
        </Section>

        <Section title="Пас и креатив" icon="🪄">
          <StatRow label="Передачи (точн./всего)" value={`${p.passesComplete}/${p.passesTotal}`} />
          <StatRow label="Точность передач" value={`${accuracy}%`} />
          <StatRow label="Передачи под удар" value={p.keyPasses} hint="кей-пассы" />
          <StatRow label="Голевые передачи" value={p.assists} />
          <StatRow label="Навесы (точные)" value={`${p.crosses} (${p.crossesComplete})`} />
          <StatRow label="Длинные передачи" value={p.longPasses} />
          <StatRow label="Передачи в разрез" value={p.throughBalls} />
          <StatRow label="Переводы фланга" value={p.switches} />
        </Section>

        <Section title="Территория и продвижение" icon="🧭">
          <StatRow label="Пасы в финальную треть" value={p.passesIntoFinalThird} />
          <StatRow label="Переносы в финальную треть" value={p.carriesIntoFinalThird} />
          <StatRow label="Входы в штрафную (пас)" value={p.entriesPenaltyArea} />
          <StatRow label="Входы в штрафную (ведение)" value={p.carriesIntoBox} />
          <StatRow label="Прогрессивные передачи" value={p.progressivePasses} />
          <StatRow label="Прогрессивные ведения" value={p.progressiveCarries} />
        </Section>

        <Section title="Дриблинг и ведение" icon="🏃‍♂️">
          <StatRow label="Обводки (успех)" value={`${p.dribblesAttempted} (${p.dribblesComplete})`} hint="попыток (усп.)" />
          <StatRow label="Процент успешных обводок" value={`${dribSucc}%`} />
          <StatRow label="Ведения мяча" value={p.carries} />
          <StatRow label="Дистанция ведений" value={round(p.carryDistance)} />
          <StatRow label="Получения передач" value={p.receptions} />
        </Section>

        <Section title="Единоборства и оборона" icon="🧱">
          <StatRow label="Единоборства (выигр./всего)" value={`${p.duelsWon}/${p.duelsTotal}`} />
          <StatRow label="Процент выигранных дуэлей" value={`${duelWin}%`} />
          <StatRow label="Отборы (успешные)" value={`${p.tackles} (${p.tacklesWon})`} />
          <StatRow label="Перехваты" value={p.interceptions} />
          <StatRow label="Блоки" value={p.blocks} />
          <StatRow label="Прессинг-действия" value={p.pressures} />
        </Section>

        <Section title="Дисциплина и прочее" icon="🧑‍⚖️">
          <StatRow label="Фолы (соверш./получ.)" value={`${p.foulsCommitted}/${p.foulsWon}`} />
          <StatRow label="Карточки" value={`🟨 ${p.yellow}  🔴 ${p.red}`} />
          <StatRow label="Подборы мяча" value={p.recoveries} />
          <StatRow label="Выносы" value={p.clearances} />
          <StatRow label="Офсайды" value={p.offsides} />
          <StatRow label="Действия под давлением" value={p.underPressureEvents} />
          <StatRow label="Потери мяча" value={p.losses} />
        </Section>
      </div>
    </div>
  );
}
