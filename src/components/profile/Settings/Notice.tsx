"use client";
export function Notice({ type, text }: { type: "ok" | "err"; text: string }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        type === "ok"
          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
          : "bg-rose-50 border-rose-200 text-rose-900"
      }`}
    >
      {text}
    </div>
  );
}
