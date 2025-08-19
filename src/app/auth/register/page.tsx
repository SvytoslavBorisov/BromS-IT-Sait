// src/app/auth/register/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { storePrivateJwk } from "@/lib/crypto/secure-storage";
import { jwkFingerprint }  from "@/lib/crypto/fingerprint";

type Sex = "MALE" | "FEMALE";

type Company = { id: string; title: string };
type Department = { id: string; title: string; companyId: string };
type Position = { id: string; title: string; companyId: string; rank: number };
type Manager = { id: string; name: string | null; surname: string | null; patronymic: string | null; email: string; positionId: string | null; departmentId: string | null };

async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const publicJwk  = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  (publicJwk as any).key_ops = ["verify"];
  (privateJwk as any).key_ops = ["sign"];
  return { publicJwk, privateJwk };
}

export default function RegisterPage() {
  const router = useRouter();

  // базовые
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // расширенные
  const [surname, setSurname] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [age, setAge] = useState(""); // YYYY-MM-DD
  const [sex, setSex] = useState<Sex>("MALE");
  const [image, setImage] = useState("");

  // орг-структура (значения)
  const [companyId, setCompanyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [managerId, setManagerId] = useState("");

  // справочники
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // первоначальная загрузка компаний и (на всякий) всех отделов/должностей
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/participants/options", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setCompanies(data.companies ?? []);
          setDepartments(data.departments ?? []);
          setPositions(data.positions ?? []);
          setManagers([]); // без фильтра не выводим
        } else {
          setError(data.error || "Ошибка загрузки справочников");
        }
      } catch {
        setError("Сетевая ошибка при загрузке справочников");
      }
    })();
  }, []);

  // когда выбираем компанию — подтягиваем её отделы/должности и менеджеров
  useEffect(() => {
    if (!companyId) {
      setDepartments([]);
      setPositions([]);
      setManagers([]);
      setDepartmentId("");
      setPositionId("");
      setManagerId("");
      return;
    }
    (async () => {
      try {
        const url = `/api/participants/options?companyId=${encodeURIComponent(companyId)}`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setDepartments(data.departments ?? []);
          setPositions(data.positions ?? []);
          setManagers(data.managers ?? []);
          // если текущие выбранные значения не принадлежат новой компании — сбросить
          if (departmentId && !(data.departments ?? []).some((d: Department) => d.id === departmentId)) {
            setDepartmentId("");
          }
          if (positionId && !(data.positions ?? []).some((p: Position) => p.id === positionId)) {
            setPositionId("");
          }
          if (managerId && !(data.managers ?? []).some((m: Manager) => m.id === managerId)) {
            setManagerId("");
          }
        } else {
          setError(data.error || "Ошибка загрузки отделов/должностей");
        }
      } catch {
        setError("Сетевая ошибка при загрузке отделов/должностей");
      }
    })();
  }, [companyId]);

  // когда выбираем отдел — фильтруем менеджеров по отделу
  useEffect(() => {
    if (!companyId) return; // менеджеров без компании не грузим
    (async () => {
      try {
        const qs = new URLSearchParams({ companyId });
        if (departmentId) qs.set("departmentId", departmentId);
        const res = await fetch(`/api/participants/options?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setManagers(data.managers ?? []);
          if (managerId && !(data.managers ?? []).some((m: Manager) => m.id === managerId)) {
            setManagerId("");
          }
        }
      } catch {
        // не фейлим форму, просто оставим текущий список
      }
    })();
  }, [companyId, departmentId]);

  const managersView = useMemo(
    () =>
      managers.map((m) => ({
        id: m.id,
        label:
          [m.surname, m.name, m.patronymic].filter(Boolean).join(" ") ||
          m.email,
      })),
    [managers]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { publicJwk, privateJwk } = await generateKeyPair();
      await storePrivateJwk(email, privateJwk);

      const pubFp = await jwkFingerprint(publicJwk); // EC‑совместимая версия

      const body = {
        name: name || undefined,
        surname: surname || undefined,
        patronymic: patronymic || undefined,
        age: age || undefined,
        sex: sex || undefined,
        email,
        password,
        image: image || undefined,

        companyId: companyId || undefined,
        departmentId: departmentId || undefined,
        positionId: positionId || undefined,
        managerId: managerId || undefined,

        publicKey: publicJwk,
        publicKeyFingerprint: pubFp,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push("/auth/login");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Не удалось зарегистрироваться");
      }
    } catch (err) {
      console.error(err);
      setError("Ошибка при генерации ключа или сети. Попробуйте ещё раз");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-md">
        <h1 className="text-2xl font-semibold text-center mb-6">Регистрация</h1>

        {error && (
          <div className="mb-4 text-red-700 bg-red-100 p-3 rounded">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ФИО */}
          <div>
            <label className="block text-sm font-medium">Имя</label>
            <input className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Фамилия</label>
            <input className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={surname} onChange={(e) => setSurname(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Отчество</label>
            <input className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={patronymic} onChange={(e) => setPatronymic(e.target.value)} />
          </div>

          {/* Личные данные */}
          <div>
            <label className="block text-sm font-medium">Дата рождения</label>
            <input type="date" className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Пол</label>
            <select className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="MALE">Мужской</option>
              <option value="FEMALE">Женский</option>
            </select>
          </div>

          {/* Аккаунт */}
          <div>
            <label className="block text-sm font-medium">Email *</label>
            <input type="email" required className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Пароль *</label>
            <input type="password" required className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {/* Аватар */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Аватар (URL)</label>
            <input type="url" className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="https://…" value={image} onChange={(e) => setImage(e.target.value)} />
          </div>

          {/* Организационная структура */}
          <div>
            <label className="block text-sm font-medium">Компания</label>
            <select className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">— Не выбрано —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Отдел</label>
            <select className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} disabled={!companyId}>
              <option value="">— Не выбрано —</option>
              {departments
                .filter((d) => !companyId || d.companyId === companyId)
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Должность</label>
            <select className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={positionId} onChange={(e) => setPositionId(e.target.value)} disabled={!companyId}>
              <option value="">— Не выбрано —</option>
              {positions
                .filter((p) => !companyId || p.companyId === companyId)
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Начальник</label>
            <select className="mt-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={managerId} onChange={(e) => setManagerId(e.target.value)} disabled={!companyId}>
              <option value="">— Не выбрано —</option>
              {managersView.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Генерация ключа и регистрация..." : "Зарегистрироваться"}
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Уже есть аккаунт?{" "}
          <a href="/auth/login" className="text-blue-600 hover:underline">Войти</a>
        </p>
      </div>
    </div>
  );
}
