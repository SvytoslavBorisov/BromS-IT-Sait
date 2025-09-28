"use client";
import React from "react";

export type Accuracy = "all" | "completed" | "incomplete";
export type PassFlagFilters = { key: boolean; cross: boolean };

export default function PassFilters({
  accuracy, onAccuracyChange,
  flags, onFlagsChange,
}: {
  accuracy: Accuracy;
  onAccuracyChange: (v: Accuracy) => void;
  flags: PassFlagFilters;
  onFlagsChange: (f: PassFlagFilters) => void;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="inline-flex rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
        {(["all","completed","incomplete"] as Accuracy[]).map(v => (
          <button
            key={v}
            className={`px-3 py-1.5 text-sm ${accuracy===v ? "bg-sky-50 text-sky-700" : "text-neutral-700 hover:bg-neutral-50"}`}
            onClick={() => onAccuracyChange(v)}
            type="button"
          >
            {v==="all" ? "Все" : v==="completed" ? "Точные" : "Неточные"}
          </button>
        ))}
      </div>

      <div className="flex gap-4 text-sm">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={flags.key}
            onChange={e => onFlagsChange({ ...flags, key: e.target.checked })}
          />
          <span>Ключевые</span>
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={flags.cross}
            onChange={e => onFlagsChange({ ...flags, cross: e.target.checked })}
          />
          <span>Кроссы</span>
        </label>
      </div>
    </div>
  );
}
