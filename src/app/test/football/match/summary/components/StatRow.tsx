"use client";
import React from "react";
import type { Pair } from "../types";
import { formatInt, pct } from "../utils";

export function StatRow({
  title,
  pair,
  fmt = formatInt,
}: {
  title: string;
  pair: Pair;
  fmt?: (v: number) => string;
}) {
  const l = Math.max(0, pair.left);
  const r = Math.max(0, pair.right);
  const lp = pct(l, r);
  const rp = 100 - lp;

  return (
    <div
      className={[
        "rounded-xl border p-3",
        "border-neutral-200 dark:border-neutral-800",
        "bg-white/60 dark:bg-neutral-900/60",
        "hover:shadow-sm transition-shadow",
      ].join(" ")}
    >
      <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-300 mb-2">
        <span className="tabular-nums">{fmt(l)}</span>
        <span className="font-medium text-neutral-800 dark:text-neutral-200">{title}</span>
        <span className="tabular-nums">{fmt(r)}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-2 bg-neutral-900/80 dark:bg-white/80 transition-[width]"
          style={{ width: `${lp}%` }}
          aria-label="left share"
        />
        <div
          className="h-2 bg-neutral-400/50 dark:bg-neutral-500/50 transition-[width]"
          style={{ width: `${rp}%` }}
          aria-label="right share"
        />
      </div>
    </div>
  );
}
