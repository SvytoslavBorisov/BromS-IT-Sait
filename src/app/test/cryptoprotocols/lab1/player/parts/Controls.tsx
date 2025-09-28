// src/app/zk-gi/player/parts/Controls.tsx
"use client";

import type { GIInstance, ProtocolEngine } from "../../types";

function phaseLabel(p: string) {
  switch (p) {
    case "commit": return "Commit";
    case "challenge": return "Challenge";
    case "response": return "Response";
    case "verify": return "Verify";
    default: return p;
  }
}

export function Controls({
  instance, engine, autoplay, onStep, onToggleAuto, onResetRound, onNewInstance,
}: {
  instance: GIInstance;
  engine: ProtocolEngine;
  autoplay: boolean;
  onStep: () => void;
  onToggleAuto: () => void;
  onResetRound: () => void;
  onNewInstance: () => void;
}) {
  const { round, phase } = engine.getState();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className="inline-flex gap-2">
        <button
          onClick={onStep}
          className="px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-800 text-sm"
        >Шаг</button>

        <button
          onClick={onToggleAuto}
          className={`px-3 py-1.5 rounded-md text-sm ${autoplay ? "bg-red-600 text-white hover:bg-red-500" : "bg-gray-200 hover:bg-gray-300"}`}
        >{autoplay ? "Стоп" : "Авто"}</button>

        <button
          onClick={onResetRound}
          className="px-3 py-1.5 rounded-md bg-gray-200 hover:bg-gray-300 text-sm"
        >Сброс раунда</button>

        <button
          onClick={onNewInstance}
          className="px-3 py-1.5 rounded-md bg-white border border-gray-300 hover:bg-gray-50 text-sm"
        >Новый инстанс</button>
      </div>

      <div className="text-sm text-gray-700">
        Раунд <span className="font-semibold tabular-nums">{round + 1}</span> / {instance.rounds} •{" "}
        <span className="inline-flex items-center gap-1">
          Фаза: <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">{phaseLabel(phase)}</span>
        </span>
      </div>
    </div>
  );
}
