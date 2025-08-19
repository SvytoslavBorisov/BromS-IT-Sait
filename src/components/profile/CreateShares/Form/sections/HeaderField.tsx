"use client";

import { Info } from "lucide-react";

export default function HeaderField({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white/60">
      <label htmlFor="title" className="block text-sm font-medium mb-1">
        Название разделения
      </label>
      <input
        id="title"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 ${
          error ? "border-red-400" : "border-gray-200"
        }`}
        placeholder="Например: «Ключ от сейфа проекта»"
        aria-invalid={!!error}
        aria-describedby={error ? "err-title" : "hint-title"}
      />
      {error ? (
        <p id="err-title" className="mt-2 text-xs text-red-600">{error}</p>
      ) : (
        <p id="hint-title" className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3.5 w-3.5" /> Дайте понятное имя, чтобы участники понимали контекст.
        </p>
      )}
    </div>
  );
}
