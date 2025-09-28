"use client";
import React from "react";

const sortOptions = [
  { key: "minutes", label: "Минуты" },
  { key: "passesComplete", label: "Пасы (точные)" },
  { key: "passesTotal", label: "Пасы (все)" },
  { key: "keyPasses", label: "Ключевые пасы" },
  { key: "assists", label: "Ассисты" },
  { key: "crosses", label: "Кроссы" },
  { key: "shotsTotal", label: "Удары" },
  { key: "shotsOnTarget", label: "Удары в створ" },
  { key: "goals", label: "Голы" },
  { key: "xG", label: "xG" },
  { key: "dribblesComplete", label: "Обводки (успешные)" },
  { key: "duelsWon", label: "Единоборства (выигр.)" },
  { key: "tackles", label: "Отборы" },
  { key: "interceptions", label: "Перехваты" },
  { key: "pressures", label: "Прессинг" },
  { key: "recoveries", label: "Подборы" },
  { key: "clearances", label: "Выносы" },
  { key: "yellow", label: "Жёлтые" },
  { key: "underPressureEvents", label: "Действия под давлением" },
];

export function Toolbar(props: any) {
  const { fileRef, onFile, onReset, onExport, query, setQuery, sortKey, setSortKey, sortDir, setSortDir, disabled } = props;
  return (
    <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile}
               className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-neutral-900 file:text-white hover:file:bg-neutral-700 cursor-pointer" />
        <button onClick={onReset}
                className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800">Сброс</button>
        <button onClick={onExport} disabled={disabled === false ? false : !disabled}
                className={(disabled ? "bg-neutral-300 text-neutral-500 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700") + " px-3 py-2 rounded-xl text-sm font-semibold"}>Export CSV</button>
      </div>
      <div className="md:col-span-2 flex gap-2 justify-end">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск игрока/позиции..."
               className="w-full md:w-1/2 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-neutral-400" />
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700">
          {sortOptions.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
        <button onClick={() => setSortDir((d: any) => d === "desc" ? "asc" : "desc")}
                className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700">{sortDir === "desc" ? "↓" : "↑"}</button>
      </div>
    </div>
  );
}