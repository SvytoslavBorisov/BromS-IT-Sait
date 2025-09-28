"use client";
import React from "react";

export function SummaryHeader({
  leftName,
  rightName,
}: {
  leftName: string;
  rightName: string;
}) {
  return (
    <header className="flex items-center justify-between">
      <div className="text-sm text-neutral-500 dark:text-neutral-400">Сводка матча</div>
      <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
        <TeamChip label={leftName} />
        <span className="text-neutral-400">—</span>
        <TeamChip label={rightName} align="right" />
      </div>
    </header>
  );
}

function TeamChip({ label, align = "left" }: { label: string; align?: "left" | "right" }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border",
        "border-neutral-200 dark:border-neutral-800",
        "bg-neutral-50/70 dark:bg-neutral-900/60",
        "px-2.5 py-1 leading-none",
      ].join(" ")}
    >
      <span
        className={[
          "size-2 rounded-full",
          align === "left" ? "bg-neutral-900 dark:bg-neutral-100" : "bg-neutral-400 dark:bg-neutral-500",
        ].join(" ")}
      />
      <span className="tabular-nums">{label}</span>
    </span>
  );
}
