"use client";

import { useMemo, useState } from "react";
import { Participant } from "@/lib/crypto/shares";

// Узкий контракт — без импорта из ".."
type SetState = (patch: {
  selected: Set<string>;
  threshold: number;
}) => void;

export default function useParticipantsFilter({
  participants,
  selected,
  setState,
}: {
  participants: Participant[];
  selected: Set<string>;
  setState: SetState;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return participants;
    const qq = q.trim().toLowerCase();
    return participants.filter((p) =>
      `${p.name ?? ""} ${p.id}`.toLowerCase().includes(qq)
    );
  }, [participants, q]);

  const allFilteredIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const allFilteredChecked =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));
  const someFilteredChecked = allFilteredIds.some((id) => selected.has(id));

  const toggleAllFiltered = (checked: boolean) => {
    const nextSelected = new Set(
      checked
        ? Array.from(new Set([...Array.from(selected), ...allFilteredIds]))
        : Array.from(selected).filter((id) => !allFilteredIds.includes(id))
    );

    setState({
      selected: nextSelected,
      threshold: Math.min(
        nextSelected.size,
        Math.max(1, nextSelected.size ? 1 : 0)
      ),
    });
  };

  return {
    q,
    setQ,
    filtered,
    allFilteredChecked,
    someFilteredChecked,
    toggleAllFiltered,
  };
}
