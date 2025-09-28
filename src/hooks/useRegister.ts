"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { storePrivateJwk } from "@/lib/crypto/secure-storage";
import { jwkFingerprint } from "@/lib/crypto/fingerprint";

export type Sex = "MALE" | "FEMALE";

export type Company   = { id: string; title: string };
export type Department= { id: string; title: string; companyId: string };
export type Position  = { id: string; title: string; companyId: string; rank: number };
export type Manager   = { id: string; name: string | null; surname: string | null; patronymic: string | null; email: string; positionId: string | null; departmentId: string | null };

async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const publicJwk  = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  (publicJwk  as any).key_ops = ["verify"];
  (privateJwk as any).key_ops = ["sign"];
  return { publicJwk, privateJwk };
}

export function useRegister() {
  const router = useRouter();

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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/participants/options", { cache: "no-store" });
        const data = await res.json();
        if (res.ok) {
          setCompanies(data.companies ?? []);
          setDepartments(data.departments ?? []);
          setPositions(data.positions ?? []);
          setManagers([]);
        } else setError(data.error || "Ошибка загрузки справочников");
      } catch {
        setError("Сетевая ошибка при загрузке справочников");
      }
    })();
  }, []);

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
  }, [companyId]);

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
  }, [companyId, departmentId]);

  const managersView = useMemo(
    () => managers.map((m) => ({
      id: m.id,
      label: [m.surname, m.name, m.patronymic].filter(Boolean).join(" ") || m.email,
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
      const pubFp = await jwkFingerprint(publicJwk);

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

      if (res.ok) router.push("/auth/login");
      else {
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
