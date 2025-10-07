"use client";

import React, { useState } from "react";
import { ensureHuman } from "@/lib/captcha/ensureHuman";
import EmailInput from "./EmailInput";
import ErrorNote from "./ErrorNote";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotForm({
  onCancel,
  onSent,
}: {
  onCancel: () => void;
  onSent: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setErr(null);
    setLoading(true);
    try {
      await ensureHuman("forgot");
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));

      // Явная обработка неподтверждённого e-mail
      if (json?.error === "EMAIL_NOT_VERIFIED") {
        setErr(json?.message || "E-mail не подтверждён. Сначала подтвердите адрес.");
        return;
      }

      if (!res.ok && json?.error) {
        throw new Error(json.error);
      }

      onSent(email.trim());
    } catch (e: any) {
      setErr(e?.message || "Ошибка. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <EmailInput
        id="forgot-email"
        value={email}
        onChange={setEmail}
        disabled={loading}
      />

      <ErrorNote message={err} />

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading || !email}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Отправка…
            </>
          ) : (
            "Отправить ссылку"
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Назад ко входу
        </button>
      </div>
    </form>
  );
}
