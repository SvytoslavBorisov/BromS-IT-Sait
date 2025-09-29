// src/hooks/useLogin.ts
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ensureHuman } from "@/lib/captcha/ensureHuman";

export function useLogin() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const router = useRouter();

  const toggleShowPass = () => setShowPass(v => !v);

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1) ОБЯЗАТЕЛЬНО: сперва получить HPT (установит HttpOnly cookie)
      await ensureHuman("login");

      // 2) Диагностика: убедимся, что сервер действительно видит HPT
      const probe = await fetch("/api/captcha/hpt", { cache: "no-store" })
        .then(r => r.json()).catch(() => ({}));

      // 3) Логин. На всякий случай — прокинем HPT в тело (фолбэк для дев-режима)
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        ...(probe?.ok && probe?.hpt ? { hpt: probe.hpt } : {}),
      });

      if (res?.ok) {
        router.replace("/profile");
      } else {
        setError("Неверный логин или пароль.");
      }
    } catch {
      setError("Подтвердите, что вы не бот и попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  return {
    email, setEmail,
    password, setPassword,
    showPass, toggleShowPass,
    loading, error, setError,
    handleSubmit,
  };
}
