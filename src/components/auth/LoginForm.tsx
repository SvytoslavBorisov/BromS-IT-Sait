"use client";

import React from "react";
import { useLogin } from "@/hooks/useLogin";
import { Eye, EyeOff, LogIn, Loader2, Mail, Lock, ShieldCheck } from "lucide-react";
import { RutokenButton } from "./RutokenButton";
import { YandexTile } from "./YandexButton";

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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* GitHub */}
              <button
                disabled={loading}
                className="group relative flex items-center justify-center h-12 rounded-2xl bg-gray-900 text-white
                           ring-1 ring-black/10 hover:ring-black/20 transition
                           hover:scale-[1.03] active:scale-[0.98] duration-200 ease-out overflow-hidden"
                aria-label="Войти через GitHub"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500
                                 bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
                <svg viewBox="0 0 24 24" className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" aria-hidden="true">
                  <path fill="currentColor"
                        d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2c-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.35-1.78-1.35-1.78-1.1-.76.08-.74.08-.74 1.21.09 1.84 1.24 1.84 1.24 1.08 1.84 2.83 1.31 3.52 1 .11-.78.42-1.31.77-1.61-2.66-.3-5.46-1.33-5.46-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.02-.33 3.34 1.23a11.6 11.6 0 0 1 6.08 0c2.32-1.56 3.34-1.23 3.34-1.23.66 1.65.24 2.87.12 3.17.77.84 1.24 1.9 1.24 3.22 0 4.61-2.8 5.63-5.47 5.93.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.83.58A12 12 0 0 0 12 .5Z" />
                </svg>
              </button>

              {/* VK */}
              <button
                disabled={loading}
                className="group relative flex items-center justify-center h-12 rounded-2xl bg-[#0077FF] text-white
                           ring-1 ring-black/10 hover:ring-black/20 transition
                           hover:scale-[1.03] active:scale-[0.98] duration-200 ease-out overflow-hidden"
                aria-label="Войти через ВКонтакте"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500
                                 bg-gradient-to-r from-white/0 via-white/20 to-white/0" />
                <svg viewBox="0 0 24 24" className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" fill="currentColor" aria-hidden="true">
                  <path d="M12.89 17.5h1.52s.46-.05.7-.3c.22-.22.22-.64.22-.64s-.03-1.95.87-2.23c.88-.28 2 1.84 3.2 2.65.9.62 1.6.48 1.6.48l3.22-.04s1.68-.1.88-1.43c-.07-.11-.49-1.02-2.51-2.88-2.12-1.95-1.84-1.64.72-5.02 1.56-2.08 2.19-3.35 1.99-3.89-.19-.53-1.37-.39-1.37-.39l-3.94.02s-.29-.04-.5.09c-.21.13-.34.43-.34.43s-.62 1.66-1.46 3.08c-1.76 2.98-2.47 3.13-2.76 2.95-.67-.43-.5-1.74-.5-2.68 0-2.91.44-4.12-.86-4.43-.43-.1-.74-.17-1.84-.18-1.41-.02-2.6.01-3.27.33-.45.22-.8.72-.59.75.26.04.84.16 1.16.6.4.55.38 1.8.38 1.8s.23 3.45-.54 3.88c-.53.29-1.25-.3-2.81-2.99-.8-1.35-1.41-2.85-1.41-2.85s-.12-.3-.33-.46c-.25-.18-.6-.24-.6-.24l-3.74.02s-.56.02-.77.26c-.18.2-.01.62-.01.62s2.93 6.86 6.25 10.32c3.04 3.16 6.5 2.96 6.5 2.96Z" />
                </svg>
              </button>

              {/* Яндекс */}
              <YandexTile />

              {/* Рутокен */}
              <RutokenButton setError={setError} />
            </div>

            {/* Небольшая подпись безопасности */}
            <div className="flex items-center justify-center gap-2 pt-1 text-xs text-gray-500">
              <ShieldCheck className="h-4 w-4" />
              <span>Защищено NextAuth — авторизация по email/паролю</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
