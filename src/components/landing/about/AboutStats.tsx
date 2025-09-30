// components/about/AboutStats.tsx
"use client";

import React from "react";

const NF = new Intl.NumberFormat("ru-RU");

export function Stat({
  label,
  to,
  suffix = "",
}: {
  label: string;
  to: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-black/10 px-4 py-3 shadow-sm">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">
        {NF.format(to)}
        {suffix}
      </div>
    </div>
  );
}
