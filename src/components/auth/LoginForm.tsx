"use client";

import React from "react";
import { useLogin } from "@/hooks/useLogin";
import { Eye, EyeOff, LogIn, Loader2, Mail, Lock, ShieldCheck } from "lucide-react";
import { RutokenButton } from "./RutokenButton";
import { YandexTile } from "./YandexButton";
import { VKTile } from "./VKButton";

export default function LoginForm() {
  const {
    email, setEmail,
    password, setPassword,
    showPass, toggleShowPass,
    loading, error, setError,
    handleSubmit,
  } = useLogin();

  // Базовые стили: крупнее поля, лучше для тач‑устройств
  const inputBase =
    "w-full rounded-2xl bg-white border border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 outline-none px-4 py-3 text-gray-900 placeholder:text-gray-400 transition";

  const labelBase = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    // Важно: НЕТ общего белого фона. Форма — белая карточка, которой управляет родитель (AuthTabs)
    <div className="w-full mx-auto max-w-2xl">
      <div className="relative rounded-3xl border border-gray-100 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.12)]">
        {/* Верхняя плашка с пиктограммой/заголовком */}
        <div className="flex flex-col gap-3 items-center justify-center px-6 pt-8 sm:pt-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
            <LogIn className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Вход в аккаунт</h1>
            <p className="text-sm text-gray-600 mt-1">Рады видеть вас снова 👋</p>
          </div>
        </div>

        {/* Полупрозрачный разделитель */}
        <div className="mx-6 sm:mx-8 mt-6 border-t border-gray-100" />

        <div className="p-6 sm:p-8">
          {/* Ошибка */}
          {error && (
            <div
              className="mb-5 rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Форма */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelBase}>Email</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-70">
                  <Mail className="h-5 w-5 text-gray-400" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`${inputBase} pl-12`}
                />
              </div>
            </div>

            <div>
              <label className={labelBase}>Пароль</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 opacity-70">
                  <Lock className="h-5 w-5 text-gray-400" />
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`${inputBase} pl-12 pr-14`}
                />
                <button
                  type="button"
                  onClick={toggleShowPass}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-xl p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                  aria-label={showPass ? "Скрыть пароль" : "Показать пароль"}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Кнопка */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-2xl bg-emerald-500 font-semibold py-3.5 transition
                         hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed text-white"
            >
              <span className="pointer-events-none absolute inset-0 translate-y-[110%] group-hover:translate-y-0 transition-transform duration-500 ease-out bg-gradient-to-t from-black/10 to-transparent" />
              <span className="relative inline-flex items-center justify-center gap-2 text-base">
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Входим…
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Войти
                  </>
                )}
              </span>
            </button>

            {/* Ссылки под формой */}
            <div className="pt-1 text-center text-sm text-gray-600 space-y-2">
              <p>
                Забыли пароль?{" "}
                <a href="/auth/forgot" className="text-emerald-600 hover:text-emerald-500 underline-offset-4 hover:underline">
                  Восстановить
                </a>
              </p>
              <p>
                Нет аккаунта?{" "}
                <a href="/auth?tab=register" className="font-medium text-emerald-600 hover:text-emerald-500 underline-offset-4 hover:underline">
                  Зарегистрироваться
                </a>
              </p>
            </div>
          </form>

          {/* Социальные и токен: на мобиле 2×2, на ширине ≥sm — 4 в ряд */}
          <div className="mt-7 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-500">или войдите через</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">

              {/* VK */}
              <VKTile />

              {/* Яндекс */}
              <YandexTile />

            </div>

            {/* Небольшая подпись безопасности */}
            <div className="flex items-center justify-center gap-2 pt-1 text-xs text-gray-500">
              <ShieldCheck className="h-4 w-4" />
              <span>Защищено NextAuth</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
