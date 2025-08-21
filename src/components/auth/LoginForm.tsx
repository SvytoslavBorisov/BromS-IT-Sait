"use client";

import React from "react";
import { useLogin } from "@/hooks/useLogin";
import { Eye, EyeOff, LogIn, Loader2, Mail, Lock } from "lucide-react";
import  { RutokenButton } from "./RutokenButton";


export default function LoginForm() {
  const {
    email, setEmail,
    password, setPassword,
    showPass, toggleShowPass,
    loading, error, setError,
    handleSubmit,
  } = useLogin();

  const inputBase =
    "w-full rounded-xl bg-white border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/60 outline-none px-3 py-2 text-gray-900 placeholder:text-gray-400 transition";

  const labelBase = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md">
        <div className="relative rounded-3xl border border-gray-200 bg-white shadow-lg">
          <div className="p-8">
            {/* Заголовок */}
            <div className="mb-6 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 mb-3">
                <LogIn className="h-6 w-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">Вход в аккаунт</h1>
              <p className="text-sm text-gray-600 mt-1">Рады видеть вас снова 👋</p>
            </div>

            {/* Ошибка */}
            {error && (
              <div className="mb-4 rounded-xl border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Форма */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelBase}>Email</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                    <Mail className="h-4 w-4 text-gray-400" />
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
                    className={`${inputBase} pl-9`}
                  />
                </div>
              </div>

              <div>
                <label className={labelBase}>Пароль</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-70">
                    <Lock className="h-4 w-4 text-gray-400" />
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
                    className={`${inputBase} pl-9 pr-12`}
                  />
                  <button
                    type="button"
                    onClick={toggleShowPass}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                    aria-label={showPass ? "Скрыть пароль" : "Показать пароль"}
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Кнопка */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl bg-emerald-500 font-semibold py-3 transition
                           hover:brightness-110 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed text-white"
              >
                <span className="relative inline-flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Входим…
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Войти
                    </>
                  )}
                </span>
              </button>

              {/* Ссылки под формой */}
              <div className="pt-2 text-center text-sm text-gray-600 space-y-2">
                <p>
                  Забыли пароль?{" "}
                  <a href="/auth/forgot" className="text-emerald-600 hover:text-emerald-500 transition">
                    Восстановить
                  </a>
                </p>
                <p>
                  Нет аккаунта?{" "}
                  <a
                    href="/auth/register"
                    className="font-medium text-emerald-600 hover:text-emerald-500 transition"
                  >
                    Зарегистрироваться
                  </a>
                </p>
              </div>
            </form>
          </div>
        </div>

        <RutokenButton setError={setError} />

        <p className="mt-6 text-center text-xs text-gray-500">
          Защищено NextAuth — авторизация по email/паролю
        </p>
      </div>
    </div>
  );
}
