"use client";
import React from "react";
import type { Pair } from "../types";
import { format1 } from "../utils";

export function Scoreboard({
  goals,
  xg,
}: {
  goals: Pair;
  xg: Pair;
}) {
  const leftAhead = goals.left > goals.right;
  const rightAhead = goals.right > goals.left;

  const box = (score: number, xgVal: number, side: "left" | "right") => (
    <div
      className={[
        "flex-1 rounded-xl border p-3",
        "border-neutral-200 dark:border-neutral-800",
        "bg-white/70 dark:bg-neutral-900/60",
        "shadow-sm",
        side === "left" && leftAhead ? "ring-1 ring-neutral-300/60 dark:ring-neutral-700/60" : "",
        side === "right" && rightAhead ? "ring-1 ring-neutral-300/60 dark:ring-neutral-700/60" : "",
      ].join(" ")}
    >
      <div className="text-3xl font-semibold tracking-tight tabular-nums text-neutral-900 dark:text-neutral-100">
        {score}
      </div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
        xG {format1(xgVal)}
      </div>
    </div>
  );

  return (
    <div className="flex items-stretch gap-3">
      {box(goals.left, xg.left, "left")}
      <div className="flex items-center justify-center px-2 text-sm text-neutral-400">:</div>
      {box(goals.right, xg.right, "right")}
    </div>
  );
}
