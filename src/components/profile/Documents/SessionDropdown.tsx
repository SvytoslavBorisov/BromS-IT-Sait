"use client";
import React from "react";
import { ShareSession } from "./types";

interface SessionDropdownProps {
  sessions: ShareSession[];
  selectedId: string;
  onSelect: (id: string) => void;
  onDone: () => void;
}

export function SessionDropdown({
  sessions,
  selectedId,
  onSelect,
  onDone,
}: SessionDropdownProps) {
  return (
    <div className="space-y-2">
      <label className="block font-medium">
        Выберите ключ или создайте новый
      </label>
      <select
        value={selectedId}
        onChange={e => onSelect(e.target.value)}
        className="block w-full border rounded p-2"
      >
        <option value="">-- выберите --</option>
        {sessions.map(s => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
        <option value="new">Создать новый ключ</option>
      </select>
      {selectedId && (
        <button
          type="button"
          onClick={onDone}
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Готово
        </button>
      )}
    </div>
  );
}