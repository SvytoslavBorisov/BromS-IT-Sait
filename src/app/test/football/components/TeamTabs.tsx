"use client";
import React, { useState } from "react";

export function TeamTabs({ teams, teamsOrder, formations, children }: any) {
  const [active, setActive] = useState(teamsOrder[0]);
  return (
    <div>
      <div className="flex gap-2 mb-4 border-b border-neutral-200 dark:border-neutral-800">
        {teamsOrder.map((tid: number) => {
          const name = teams.get(tid)?.[0]?.teamName || `Team ${tid}`;
          const form = formations.get(tid);
          const is = active === tid;
          return (
            <button key={tid} onClick={() => setActive(tid)}
              className={(is ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100") + " px-3 py-2 rounded-t-xl font-medium"}>
              {name}{form ? <span className="opacity-70 ml-2">({form})</span> : null}
            </button>
          );
        })}
      </div>
      <div>{children(active)}</div>
    </div>
  );
}