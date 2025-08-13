// components/participants/ParticipantsList.tsx
"use client";

import { Participant } from "@/lib/crypto/shares";

interface Props {
  participants: Participant[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

export default function ParticipantsList({ participants, selected, onToggle }: Props) {
  return (
    <div className="space-y-1">
      <p className="font-medium">Участники (×{selected.size}):</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {participants.map((p) => {
          const isSel = selected.has(p.id);
          return (
            <div
              key={p.id}
              onClick={() => onToggle(p.id)}
              className={`border rounded-lg p-4 cursor-pointer transition ${
                isSel
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{p.name}</span>
                {isSel && <span className="text-blue-600 font-bold">✓</span>}
              </div>
              <p className="text-sm text-gray-500">ID: {p.id}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
