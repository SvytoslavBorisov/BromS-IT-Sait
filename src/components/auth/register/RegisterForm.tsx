// src/components/auth/register/RegisterForm.tsx
"use client";

import React, { useEffect, useRef } from "react";
import Header from "./ui/Header";
import { useRegister } from "@/hooks/useRegister";
import ErrorAlert from "./ErrorAlert";

export default function RegisterForm() {
  const {
    email, setEmail, password, setPassword,
    name, setName, surname, setSurname, age, setAge,
    error, setError, loading, handleSubmit,
  } = useRegister();

  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);

  const inputBase =
    "w-full rounded-xl border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 outline-none px-4 py-2.5 text-gray-900 placeholder:text-gray-400 transition";
  const labelBase = "mb-1.5 block text-sm font-medium text-gray-700";
  const clearError = () => error && setError(null);

  return (
    <div
      className="
        w-full
        rounded-none border-0 shadow-none bg-transparent
        md:rounded-3xl md:border-0 md:bg-white/70 md:backdrop-blur-sm md:shadow-lg
      "
    >
      <div className="px-2 md:px-8">
        <Header title="Регистрация" icon="register" />
      </div>

      <div className="hidden md:block mx-8 mt-6 border-t border-neutral-100" />

      <div className="px-2 py-4 md:p-8">
        <ErrorAlert message={error ?? ""} />
        {!mounted.current ? null : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className={labelBase}>Имя</label>
                <input
                  id="name"
                  className={inputBase}
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearError(); }}
                  placeholder="Иван"
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label htmlFor="surname" className={labelBase}>Фамилия</label>
                <input
                  id="surname"
                  className={inputBase}
                  value={surname}
                  onChange={(e) => { setSurname(e.target.value); clearError(); }}
                  placeholder="Иванов"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="age" className={labelBase}>Дата рождения</label>
              <input
                id="age"
                type="date"
                className={inputBase}
                value={age}
                onChange={(e) => { setAge(e.target.value); clearError(); }}
                autoComplete="bday"
              />
            </div>

            <div>
              <label htmlFor="email" className={labelBase}>Email *</label>
              <input
                id="email"
                type="email"
                required
                className={inputBase}
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className={labelBase}>Пароль *</label>
              <input
                id="password"
                type="password"
                required
                className={inputBase}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 text-white font-medium py-3 transition
                         hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:opacity-60"
            >
              {loading ? "Создание аккаунта…" : "Создать аккаунт"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
