"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function ThresholdSection({
  k, n, combos, error, onChange,
}: {
  k: number;
  n: number;
  combos: number;
  error?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white/60">
      <label className="block text-sm font-medium mb-1">Порог восстановления (k из n)</label>
      <input
        type="range"
        min={1}
        max={Math.max(1, n)}
        value={k}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="mt-1 flex flex-wrap items-center justify-between text-sm">
        <div>
          k = <b>{k}</b>, n = <b>{n}</b>
          <span className="text-muted-foreground">, комбинаций: ~{combos}</span>
        </div>
        <RiskHint k={k} n={n} />
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function RiskHint({ k, n }: { k: number; n: number }) {
  if (n === 0) {
    return (
      <span className="inline-flex items-center text-red-600">
        <AlertTriangle className="w-4 h-4 mr-1" /> Выберите участников
      </span>
    );
  }
  if (k === 1) {
    return (
      <span className="inline-flex items-center text-amber-600">
        <AlertTriangle className="w-4 h-4 mr-1" /> Риск: один участник восстановит секрет
      </span>
    );
  }
  if (k === n) {
    return (
      <span className="inline-flex items-center text-amber-600">
        <AlertTriangle className="w-4 h-4 mr-1" /> Требуются все — может быть неудобно
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-emerald-600">
      <CheckCircle2 className="w-4 h-4 mr-1" /> Сбалансированный порог
    </span>
  );
}
