"use client";

import { Button } from "@/components/ui/button";
import ParticipantsList from "@/components/profile/ParticipantsList";
import { Participant } from "@/lib/crypto/shares";
import { Search, X } from "lucide-react";

export default function ParticipantsSection({
  q, setQ,
  participants,
  selected,
  onToggle,
  allFilteredChecked,
  someFilteredChecked,
  toggleAllFiltered,
  selectedCount,
}: {
  q: string;
  setQ: (v: string) => void;
  participants: Participant[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  allFilteredChecked: boolean;
  someFilteredChecked: boolean;
  toggleAllFiltered: (checked: boolean) => void;
  selectedCount: number;
}) {
  return (
    <fieldset className="rounded-2xl border p-4 shadow-sm bg-white/60">
      <legend className="text-sm font-medium px-1">Участники</legend>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по имени/логину"
            className="pl-8 pr-8 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-black/10"
          />
          {q && (
            <button
              type="button"
              className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
              onClick={() => setQ("")}
              aria-label="Очистить поиск"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => toggleAllFiltered(!allFilteredChecked)}
          >
            {allFilteredChecked ? "Снять все (фильтр)" : "Выбрать все (фильтр)"}
          </Button>
          <span className="text-sm text-muted-foreground">
            Выбрано: <b>{selectedCount}</b>
          </span>
          {someFilteredChecked && !allFilteredChecked && (
            <span className="text-xs text-muted-foreground">(частично по фильтру)</span>
          )}
        </div>
      </div>

      <ParticipantsList
        participants={participants}
        selected={selected}
        onToggle={onToggle}
      />
    </fieldset>
  );
}
