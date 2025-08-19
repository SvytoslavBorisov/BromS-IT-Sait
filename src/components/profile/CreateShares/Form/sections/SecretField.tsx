"use client";

import { useState } from "react";
import { Eye, EyeOff, Info } from "lucide-react";

export default function SecretField({
  value,
  onChange,
  error,
  strength,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  strength: { score: number; label: string };
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white/60">
      <div className="flex items-center justify-between">
        <label htmlFor="secret" className="block text-sm font-medium mb-1">Секрет</label>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border hover:bg-gray-50"
          aria-pressed={show}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {show ? "Скрыть" : "Показать"}
        </button>
      </div>

      <textarea
        id="secret"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 ${
          error ? "border-red-400" : "border-gray-200"
        } ${!show ? "blur-[3px] hover:blur-0 transition" : ""}`}
        rows={4}
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={error ? "err-secret" : "hint-secret"}
      />

      <div className="mt-2 flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full ${
              strength.score >= 80
                ? "bg-emerald-500"
                : strength.score >= 50
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, strength.score))}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground min-w-20 text-right">{strength.label}</div>
      </div>

      {error ? (
        <p id="err-secret" className="mt-2 text-xs text-red-600">{error}</p>
      ) : (
        <p id="hint-secret" className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3.5 w-3.5" />
          Рекомендуется высокая энтропия: длинная строка, цифры/буквы/символы.
        </p>
      )}
    </div>
  );
}
