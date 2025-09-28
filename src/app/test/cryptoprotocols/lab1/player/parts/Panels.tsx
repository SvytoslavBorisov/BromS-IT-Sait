// src/app/zk-gi/player/parts/Panels.tsx
"use client";

import type { ProtocolEngine } from "../../types";

export function Panels({ engine, log }: { engine: ProtocolEngine; log: string[] }) {
  const { phase, sigma, responsePerm, b, stats } = engine.getState();

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
      <Panel title="Внутреннее состояние">
        <Row label="phase" value={phase} mono />
        <Row label="σ" value={sigma ? `[${sigma.join(", ")}]` : "—"} mono />
        <Row label="Ответная перестановка" value={responsePerm ? `[${responsePerm.join(", ")}]` : "—"} mono />
        <Row label="b" value={b ?? "—"} mono />
      </Panel>

      <Panel title="Статистика">
        <Row label="accepted" value={stats.accepted} />
        <Row label="rejected" value={stats.rejected} />
        <Row label="пройдено раундов" value={stats.completed} />
      </Panel>

      <Panel title="Лог">
        <div className="max-h-44 overflow-auto space-y-1 text-xs text-gray-700 pr-1">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-3">
      <div className="mb-2 text-sm font-semibold text-gray-800">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm text-gray-700">
      <span className="text-gray-600">{label}:</span>
      <span className={mono ? "font-mono break-all ml-2" : "ml-2"}>{String(value)}</span>
    </div>
  );
}
