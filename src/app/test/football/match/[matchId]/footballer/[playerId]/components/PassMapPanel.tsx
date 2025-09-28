"use client";

import React, { useMemo, useState } from "react";
import PassMap from "./PassMap";
import PassFilters, { type Accuracy, type PassFlagFilters } from "./PassFilters";
import type { PassRow } from "../hooks/usePlayerPasses";

export default function PassMapPanel({
  passes,
  flipped,
}: {
  passes: PassRow[];
  flipped: boolean;
}) {
  const [accuracy, setAccuracy] = useState<Accuracy>("all");
  const [flags, setFlags] = useState<PassFlagFilters>({ key: false, cross: false });

  const filtered = useMemo(() => {
    return passes.filter(p => {
      if (accuracy === "completed" && !p.completed) return false;
      if (accuracy === "incomplete" && p.completed) return false;
      if (flags.key && !p.key) return false;
      if (flags.cross && !p.cross) return false;
      return true;
    });
  }, [passes, accuracy, flags]);

  return (
    <section className="rounded-2xl border border-neutral-200 shadow-sm bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-800">Карта передач</h2>
        <div className="text-xs text-neutral-500">
          Ось: 120×80 · Ориентация: {flipped ? "авто (зерк.)" : "нормальная"}
        </div>
      </div>

      <div className="p-4">
        <PassFilters
          accuracy={accuracy}
          onAccuracyChange={setAccuracy}
          flags={flags}
          onFlagsChange={setFlags}
        />

        <PassMap passes={filtered} className="w-full h-[62vh] mt-4" />

        <div className="mt-3 flex gap-4 text-xs text-neutral-600">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-4 h-[3px] bg-sky-500 rounded" /> успешные
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-4 h-[3px] bg-emerald-600 rounded" /> ассист/ключевой
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-4 h-[3px] bg-neutral-400 rounded" /> неуспешные
          </span>
          <span className="ml-auto text-neutral-500">{filtered.length} из {passes.length}</span>
        </div>
      </div>
    </section>
  );
}
