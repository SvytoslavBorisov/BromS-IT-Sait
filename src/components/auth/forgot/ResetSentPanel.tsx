// src/components/auth/forgot/ResetSentPanel.tsx
"use client";

import React, { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function ResetSentPanel({
  email,
  onBackToLogin,
  onResend,
}: {
  email: string;
  onBackToLogin: () => void;
  onResend: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleResend = async () => {
    setLoading(true);
    setMsg(null);
    try {
      await onResend();
      setMsg("Если адрес существует, письмо для сброса отправлено.");
    } catch {
      setMsg("Не удалось отправить письмо. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 md:pt-3">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50">
        <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
      </div>
      <h2 className="mt-3 text-xl font-semibold text-black">Ссылка отправлена</h2>
      <p className="mt-2 text-neutral-700">
        Если адрес <span className="font-medium">{email}</span> существует в системе, письмо для
        сброса уже отправлено. Проверьте входящие и папку «Спам».
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={onBackToLogin}
          className="
            inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium
            text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
          "
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Вернуться ко входу
        </button>

        <button
          onClick={handleResend}
          disabled={loading}
          className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50 disabled:opacity-60"
        >
          {loading ? "Отправляем…" : "Отправить ещё раз"}
        </button>
      </div>

      {msg && <p className="mt-3 text-sm text-neutral-700">{msg}</p>}
    </div>
  );
}
