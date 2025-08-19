"use client";
export function SaveBar({
  saving,
  onSave,
}: {
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex justify-end">
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white shadow hover:bg-primary/90 disabled:opacity-50"
        type="button"
      >
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </div>
  );
}
