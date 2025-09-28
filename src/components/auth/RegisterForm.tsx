"use client";

import React, { useState, useEffect } from "react";
import { useRegister } from "@/hooks/useRegister";
import { Loader2, UserPlus } from "lucide-react";

export default function RegisterForm() {
  const [isClient, setIsClient] = useState(false);
  
  const {
    email, setEmail, password, setPassword, name, setName,
    surname, setSurname, patronymic, setPatronymic, age, setAge,
    sex, setSex, image, setImage,
    companyId, setCompanyId, departmentId, setDepartmentId,
    positionId, setPositionId, managerId, setManagerId,
    companies, departments, positions, managersView,
    error, setError, loading, handleSubmit,
  } = useRegister();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const inputBase =
    "w-full rounded-xl bg-white border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/60 outline-none px-3 py-2 text-gray-900 placeholder:text-gray-400 transition";

  const labelBase = "mb-1.5 block text-sm font-medium text-gray-700";

  // Показываем скелетон загрузки до гидратации
  if (!isClient) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-3xl">
          <div className="relative rounded-3xl border border-gray-200 bg-white shadow-lg">
            <div className="p-8">
              <div className="mb-6 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 mb-3">
                  <UserPlus className="h-6 w-6 text-emerald-600" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900">Регистрация</h1>
                <p className="text-sm text-gray-600 mt-1">Создайте аккаунт за минуту</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-10 bg-gray-100 rounded-xl"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-3xl">
        <div className="relative rounded-3xl border border-gray-200 bg-white shadow-lg">
          <div className="p-8">
            {/* Заголовок */}
            <div className="mb-6 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 mb-3">
                <UserPlus className="h-6 w-6 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">Регистрация</h1>
              <p className="text-sm text-gray-600 mt-1">Создайте аккаунт за минуту</p>
            </div>

            {/* Ошибка */}
            {error && (
              <div className="mb-4 rounded-xl border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {/* Форма */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ФИО */}
              <div className="md:col-span-1">
                <label htmlFor="name" className={labelBase}>
                  Имя
                </label>
                <input
                  id="name"
                  name="name"
                  className={inputBase}
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (error) setError(null); }}
                  placeholder="Иван"
                />
              </div>

              <div>
                <label htmlFor="surname" className={labelBase}>
                  Фамилия
                </label>
                <input
                  id="surname"
                  name="surname"
                  className={inputBase}
                  value={surname}
                  onChange={(e) => { setSurname(e.target.value); if (error) setError(null); }}
                  placeholder="Иванов"
                />
              </div>

              <div>
                <label htmlFor="patronymic" className={labelBase}>
                  Отчество
                </label>
                <input
                  id="patronymic"
                  name="patronymic"
                  className={inputBase}
                  value={patronymic}
                  onChange={(e) => { setPatronymic(e.target.value); if (error) setError(null); }}
                  placeholder="Иванович"
                />
              </div>

              <div>
                <label htmlFor="age" className={labelBase}>
                  Дата рождения
                </label>
                <input
                  id="age"
                  name="age"
                  type="date"
                  className={inputBase}
                  value={age}
                  onChange={(e) => { setAge(e.target.value); if (error) setError(null); }}
                />
              </div>

              <div>
                <label htmlFor="sex" className={labelBase}>
                  Пол
                </label>
                <select
                  id="sex"
                  name="sex"
                  className={inputBase}
                  value={sex}
                  onChange={(e) => { setSex(e.target.value as any); if (error) setError(null); }}
                >
                  <option value="MALE">Мужской</option>
                  <option value="FEMALE">Женский</option>
                </select>
              </div>

              {/* Аккаунт */}
              <div>
                <label htmlFor="email" className={labelBase}>
                  Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className={inputBase}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className={labelBase}>
                  Пароль *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className={inputBase}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(null); }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              {/* Аватар */}
              <div className="md:col-span-2">
                <label htmlFor="image" className={labelBase}>
                  Аватар (URL)
                </label>
                <input
                  id="image"
                  name="image"
                  type="url"
                  className={inputBase}
                  placeholder="https://…"
                  value={image}
                  onChange={(e) => { setImage(e.target.value); if (error) setError(null); }}
                />
              </div>

              {/* Организационная структура */}
              <div>
                <label htmlFor="company" className={labelBase}>
                  Компания
                </label>
                <select
                  id="company"
                  name="company"
                  className={inputBase}
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                >
                  <option value="">— Не выбрано —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="department" className={labelBase}>
                  Отдел
                </label>
                <select
                  id="department"
                  name="department"
                  className={inputBase}
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  disabled={!companyId}
                >
                  <option value="">— Не выбрано —</option>
                  {departments
                    .filter((d) => !companyId || d.companyId === companyId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="position" className={labelBase}>
                  Должность
                </label>
                <select
                  id="position"
                  name="position"
                  className={inputBase}
                  value={positionId}
                  onChange={(e) => setPositionId(e.target.value)}
                  disabled={!companyId}
                >
                  <option value="">— Не выбрано —</option>
                  {positions
                    .filter((p) => !companyId || p.companyId === companyId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="manager" className={labelBase}>
                  Начальник
                </label>
                <select
                  id="manager"
                  name="manager"
                  className={inputBase}
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  disabled={!companyId}
                >
                  <option value="">— Не выбрано —</option>
                  {managersView.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Кнопка */}
              <div className="md:col-span-2 pt-2">
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
                        Генерация ключа и регистрация…
                      </>
                    ) : (
                      <>
                        Создать аккаунт
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>

            {/* Ссылки под формой */}
            <div className="mt-4 text-center text-sm text-gray-600">
              Уже есть аккаунт?{" "}
              <a href="/auth/login" className="font-medium text-emerald-600 hover:text-emerald-500 transition">
                Войти
              </a>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Защищено NextAuth
        </p>
      </div>
    </div>
  );
}