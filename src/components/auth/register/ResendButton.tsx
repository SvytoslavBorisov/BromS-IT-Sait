// src/components/auth/register/ResendButton.tsx
"use client";

import React, { useState } from "react";
import { ensureHuman } from "@/lib/captcha/ensureHuman";

export default function ResendButton({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setMsg(null);
    try {
      await ensureHuman("resend");
      const resp = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await resp.json().catch(() => ({}));
      setMsg(
        data?.message ||
          (resp.ok ? "Письмо отправлено." : "Не удалось отправить письмо.")
      );
    } catch {
      setMsg("Подтвердите, что вы не бот и попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={loading}
        className="inline-flex items-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "Отправляем..." : "Отправить ещё раз"}
      </button>
      {msg && <p className="mt-2 text-sm text-neutral-700">{msg}</p>}
    </div>
  );
}
