// components/profile/documents/DocumentsHeader.tsx
"use client";

export default function DocumentsHeader() {
  return (
    <div className="sticky top-0 z-20 bg-white border-b">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-9 w-9 rounded-2xl border flex items-center justify-center shadow-sm">
              <span className="text-sm font-semibold">SSS</span>
            </div>
            <div className="truncate">
              <h1 className="text-lg md:text-xl font-semibold leading-6 truncate">
                Документы
              </h1>
              <p className="text-xs md:text-sm text-gray-500">
                Ваши документы
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
