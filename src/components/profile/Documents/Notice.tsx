// components/profile/documents/Notice.tsx
"use client";

import type { Notice } from "@/hooks/useDocuments";

export default function Notice({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  if (!notice) return null;
  const isOk = notice.type === "success";
  const box = isOk
    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
    : "bg-rose-50 border-rose-200 text-rose-900";

  return (
    <div className={`w-full rounded-xl border p-3 ${box}`} role="alert">
      <div className="flex items-start justify-between">
        <span className="text-sm">{notice.text}</span>
        <button onClick={onClose} className="text-xs opacity-70 hover:opacity-100">✕</button>
      </div>
    </div>
  );
}
