// components/profile/documents/UploadSection.tsx
"use client";

export default function UploadSection({
  file, setFile, onUpload, loading,
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  onUpload: (e: React.FormEvent) => void;
  loading: boolean;
}) {
  return (
    <section className="w-full rounded-2xl border bg-white">
      <form onSubmit={onUpload} className="p-5 md:p-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium">Выберите файл</label>
          <input
            type="file"
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Поддерживаются любые типы. Размер — по настройкам сервера.
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            type="submit"
            disabled={!file || loading}
            className="w-full md:w-auto rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Загрузка..." : "Загрузить"}
          </button>
        </div>
      </form>
    </section>
  );
}
