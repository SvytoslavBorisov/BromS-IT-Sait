"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ensureHuman } from "@/lib/captcha/ensureHuman";
import { Lock, ShieldCheck, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResetPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const email = useMemo(() => sp.get("email") || "", [sp]);
  const token = useMemo(() => sp.get("token") || "", [sp]);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (password.length < 8) return setErr("Минимум 8 символов");
    if (password !== password2) return setErr("Пароли не совпадают");

    setLoading(true);
    try {
      await ensureHuman("reset");
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, token, newPassword: password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Ошибка");
      setOk(true);
      setTimeout(() => router.push("/auth?tab=login&reset=ok"), 1200);
    } catch (e: any) {
      setErr(e?.message || "Ошибка. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center px-4">
      <section
        className="
          w-full max-w-md rounded-2xl overflow-hidden shadow-lg
          bg-white/80 dark:bg-neutral-900/80 backdrop-blur
          ring-1 ring-neutral-200/70 dark:ring-neutral-800/70
        "
        aria-labelledby="reset-heading"
      >
        {/* Шапка: градиент в стиле основных форм */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-700 via-emerald-600 to-sky-600 text-white">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/15">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 id="reset-heading" className="text-lg font-semibold leading-none">
              Сброс пароля
            </h1>
          </div>
          <p className="mt-2 text-sm/relaxed text-white/85">
            Придумайте новый пароль и подтвердите его.
          </p>
        </div>

        {/* Контент */}
        <div className="p-6">
          {ok ? (
            <div className="flex flex-col items-start gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/30">
                <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  Пароль обновлён
                </h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  Перенаправляем на страницу входа…
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus:outline-none"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  К странице входа
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4" noValidate aria-describedby={err ? "reset-error" : undefined}>
              {/* Новый пароль */}
              <div>
                <label htmlFor="pass1" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Новый пароль
                </label>
                <div
                  className="
                    group flex items-center gap-2 rounded-xl px-3 py-2
                    ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700
                    bg-white dark:bg-neutral-900
                    focus-within:ring-2 focus-within:ring-emerald-500
                  "
                >
                  <Lock className="h-4 w-4 text-neutral-500 group-focus-within:text-emerald-600" aria-hidden="true" />
                  <input
                    id="pass1"
                    type={show1 ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none"
                    placeholder="********"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow1((v) => !v)}
                    className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none"
                    aria-label={show1 ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-neutral-500">Минимум 8 символов.</p>
              </div>

              {/* Подтверждение пароля */}
              <div>
                <label htmlFor="pass2" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Повторите пароль
                </label>
                <div
                  className="
                    group flex items-center gap-2 rounded-xl px-3 py-2
                    ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700
                    bg-white dark:bg-neutral-900
                    focus-within:ring-2 focus-within:ring-emerald-500
                  "
                >
                  <Lock className="h-4 w-4 text-neutral-500 group-focus-within:text-emerald-600" aria-hidden="true" />
                  <input
                    id="pass2"
                    type={show2 ? "text" : "password"}
                    required
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    className="w-full bg-transparent text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none"
                    placeholder="********"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShow2((v) => !v)}
                    className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none"
                    aria-label={show2 ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Ошибка */}
              {err && (
                <p id="reset-error" className="text-sm text-red-600 dark:text-red-500">
                  {err}
                </p>
              )}

              {/* Кнопка */}
              <button
                type="submit"
                disabled={loading || !password || !password2}
                className="
                  inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5
                  font-medium text-white
                  bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                  focus:outline-none
                "
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Сохраняем…
                  </>
                ) : (
                  "Сбросить пароль"
                )}
              </button>

              {/* Навигация */}
              <div className="flex items-center justify-between pt-1">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 focus:outline-none"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Назад ко входу
                </Link>
                <Link
                  href="/auth/register"
                  className="text-sm text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 focus:outline-none"
                >
                  Создать аккаунт
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
