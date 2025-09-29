// src/app/auth/forgot/page.tsx
"use client";

import React, { useState } from "react";
import { ensureHuman } from "@/lib/captcha/ensureHuman";
import { Mail, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await ensureHuman("forgot");
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && json?.error) throw new Error(json.error);
      setSent(true);
    } catch (e: any) {
      setErr(e?.message || "Ошибка. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4">
      <section
        className="
          w-full max-w-md rounded-2xl overflow-hidden shadow-lg
          bg-white/80 dark:bg-neutral-900/80 backdrop-blur
          ring-1 ring-neutral-200/70 dark:ring-neutral-800/70
        "
        aria-labelledby="forgot-heading"
      >
        {/* Шапка: градиент в стиле основных форм */}
        <div
          className="
            px-6 py-5
            bg-gradient-to-r from-emerald-700 via-emerald-600 to-sky-600
            text-white
          "
        >
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 id="forgot-heading" className="text-lg font-semibold leading-none">
              Восстановление пароля
            </h1>
          </div>
          <p className="mt-2 text-sm/relaxed text-white/85">
            Укажите e-mail — отправим ссылку для сброса пароля.
          </p>
        </div>

        {/* Контент: фиксируем минимальную высоту, чтобы форма не «прыгала» */}
        <div className="p-6">
          <form
            onSubmit={onSubmit}
            className="space-y-4"
            noValidate
            aria-describedby={err ? "forgot-error" : undefined}
          >
            {!sent ? (
              <>
                {/* Поле e-mail */}
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  E-mail
                </label>
                <div
                  className="
                    group flex items-center gap-2 rounded-xl px-3 py-2
                    ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700
                    bg-white dark:bg-neutral-900
                    focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-0
                  "
                >
                  <Mail className="h-4 w-4 text-neutral-500 group-focus-within:text-emerald-600" aria-hidden="true" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="
                      w-full bg-transparent text-neutral-900 dark:text-neutral-50
                      placeholder:text-neutral-400 dark:placeholder:text-neutral-500
                      outline-none focus:outline-none focus-visible:outline-none
                    "
                  />
                </div>

                {/* Ошибка */}
                {err && (
                  <p id="forgot-error" className="text-sm text-red-600 dark:text-red-500">
                    {err}
                  </p>
                )}

                {/* Кнопка */}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="
                    inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5
                    font-medium text-white
                    bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                    focus:outline-none focus-visible:outline-none
                  "
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

                {/* Навигация */}
                <div className="flex items-center justify-between pt-1">
                  <Link
                    href="/auth/login"
                    className="
                      inline-flex items-center gap-1.5 text-sm
                      text-emerald-700 hover:text-emerald-800
                      dark:text-emerald-400 dark:hover:text-emerald-300
                      focus:outline-none focus-visible:outline-none
                    "
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Назад ко входу
                  </Link>
                  <Link
                    href="/auth/register"
                    className="
                      text-sm text-neutral-600 hover:text-neutral-800
                      dark:text-neutral-400 dark:hover:text-neutral-200
                      focus:outline-none focus-visible:outline-none
                    "
                  >
                    Создать аккаунт
                  </Link>
                </div>
              </>
            ) : (
              // Успешное состояние (не прыгает по высоте)
              <div className="flex flex-col items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30">
                  <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                    Ссылка отправлена
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    Если адрес существует в системе, письмо для сброса уже отправлено.
                    Проверьте входящие и папку «Спам».
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/auth/login"
                    className="
                      inline-flex items-center gap-1.5 rounded-lg px-3 py-2
                      text-sm font-medium
                      text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                      focus:outline-none focus-visible:outline-none
                    "
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Вернуться ко входу
                  </Link>
                </div>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
