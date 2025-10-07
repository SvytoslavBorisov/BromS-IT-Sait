"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ensureHuman } from "@/lib/captcha/ensureHuman";
import { storePrivateJwk } from "@/lib/crypto/secure-storage"; // твой модуль
import { jwkFingerprint } from "@/lib/crypto/fingerprint";     // твой модуль
import { generateGostKeyPair } from "@/lib/crypto/generateGostKeyPair"; // новый файл сверху

export type Sex = "MALE" | "FEMALE";

export type Company    = { id: string; title: string };
export type Department = { id: string; title: string; companyId: string };
export type Position   = { id: string; title: string; companyId: string; rank: number };
export type Manager    = { id: string; name: string | null; surname: string | null; patronymic: string | null; email: string; positionId: string | null; departmentId: string | null };

type RegisterResult =
  | { ok: true; redirectTo?: string; message?: string }
  | { ok: false; error?: string; message?: string };

export function useRegister() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const [surname, setSurname] = useState("");
  const [patronymic, setPatronymic] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("MALE");
  const [image, setImage] = useState("");

  const [companyId, setCompanyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [managerId, setManagerId] = useState("");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  // Первичная загрузка справочников (оставлю закомментированным, как у тебя)
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const res = await fetch("/api/participants/options", { cache: "no-store" });
  //       const data = await res.json();
  //       if (res.ok) {
  //         setCompanies(data.companies ?? []);
  //         setDepartments(data.departments ?? []);
  //         setPositions(data.positions ?? []);
  //         setManagers([]);
  //       } else setError(data.error || "Ошибка загрузки справочников");
  //     } catch {
  //       setError("Сетевая ошибка при загрузке справочников");
  //     }
  //   })();
  // }, []);

  // Каскад по компании
  useEffect(() => {
    if (!companyId) {
      setDepartments([]); setPositions([]); setManagers([]);
      setDepartmentId(""); setPositionId(""); setManagerId("");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/participants/options?companyId=${encodeURIComponent(companyId)}`, { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setDepartments(data.departments ?? []);
          setPositions(data.positions ?? []);
          setManagers(data.managers ?? []);
          if (departmentId && !(data.departments ?? []).some((d: Department) => d.id === departmentId)) setDepartmentId("");
          if (positionId &&   !(data.positions   ?? []).some((p: Position)   => p.id === positionId))   setPositionId("");
          if (managerId &&    !(data.managers    ?? []).some((m: Manager)    => m.id === managerId))    setManagerId("");
        } else setError(data.error || "Ошибка загрузки отделов/должностей");
      } catch {
        setError("Сетевая ошибка при загрузке отделов/должностей");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // Дозагрузка менеджеров при смене отдела
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      try {
        const qs = new URLSearchParams({ companyId });
        if (departmentId) qs.set("departmentId", departmentId);
        const res = await fetch(`/api/participants/options?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setManagers(data.managers ?? []);
          if (managerId && !(data.managers ?? []).some((m: Manager) => m.id === managerId)) setManagerId("");
        }
      } catch { /* no-op */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, departmentId]);

  const managersView = useMemo(
    () => managers.map((m) => ({
      id: m.id,
      label: [m.surname, m.name, m.patronymic].filter(Boolean).join(" ") || m.email,
    })),
    [managers]
  );

  /**
   * Сабмит регистрации.
   * Возвращает результат сервера: { ok, redirectTo?, error? }.
   * Роутинг НЕ делаем здесь — пусть компонент-форма делает редирект по redirectTo.
   */
  const handleSubmit = async (e: React.FormEvent): Promise<RegisterResult> => {
    e.preventDefault();
    if (submittingRef.current) return { ok: false, error: "already_submitting" };
    submittingRef.current = true;

    setError(null);
    setLoading(true);

    try {
      // 1) Генерация ДОЛГОВРЕМЕННОЙ транспортной пары ГОСТ (ECIES-GOST-2012-256) на клиенте
      const { publicJwk, privateJwk } = await generateGostKeyPair();

      // Нормализация (на случай если генератор не заполнил)
      (publicJwk  as any).alg     = (publicJwk  as any).alg ?? "ECIES-GOST-2012-256";
      (privateJwk as any).alg     = (privateJwk as any).alg ?? "ECIES-GOST-2012-256";
      (publicJwk  as any).key_ops = (publicJwk  as any).key_ops ?? ["encrypt","wrapKey"];
      (privateJwk as any).key_ops = (privateJwk as any).key_ops ?? ["decrypt","unwrapKey"];

      // 2) Сохранить приватный JWK локально (твой secure-storage)
      await storePrivateJwk(email, privateJwk);

      // 3) Отпечаток публичного ключа
      const pubFp = await jwkFingerprint(publicJwk);

      // 4) HPT/капча — ВАЖНО: совпадает со scope, который ждёт сервер!
      await ensureHuman("register");

      // 5) Регистрация на сервере
      const payload = {
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

        // Транспортный ГОСТ-ключ
        publicKey: publicJwk,
        publicKeyFingerprint: pubFp,
        e2ePublicKeyAlg: "ECIES-GOST-2012-256",
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && (data?.ok ?? true)) {
        // Возвращаем redirectTo наверх — форма сама сделает router.replace
        return { ok: true, redirectTo: data?.redirectTo, message: data?.message };
      }

      // Ошибка с сервера
      const msg = data?.message || data?.error || "Не удалось зарегистрироваться";
      setError(msg);
      return { ok: false, error: data?.error || "register_failed", message: msg };
    } catch (err) {
      console.error(err);
      const msg = "Ошибка при генерации ключа или сети. Попробуйте ещё раз";
      setError(msg);
      return { ok: false, error: "exception", message: msg };
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return {
    email, setEmail, password, setPassword, name, setName,
    surname, setSurname, patronymic, setPatronymic, age, setAge,
    sex, setSex, image, setImage,
    companyId, setCompanyId, departmentId, setDepartmentId,
    positionId, setPositionId, managerId, setManagerId,
    companies, departments, positions, managersView,

    error, setError, loading,
    handleSubmit,
  };
}
