"use client";
export function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      className={`inline-flex h-6 w-11 items-center rounded-full transition ${
        on ? "bg-emerald-600" : "bg-gray-300"
      }`}
      onClick={onToggle}
      type="button"
    >
      <span
        className={`h-5 w-5 bg-white rounded-full shadow transform transition ${
          on ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
