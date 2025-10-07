// src/hooks/useLogin.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ensureHuman } from "@/lib/captcha/ensureHuman";

function mapError(code?: string): string {
  switch (code) {
    case "E_CAPTCHA_REQUIRED":
      return "Подтвердите, что вы не бот (капча).";
    case "E_BAD_CREDENTIALS":
      return "Неверный логин или пароль.";
    case "E_NO_PASSWORD":
      return "Для этого аккаунта не задан пароль. Войдите через VK/Яндекс или задайте пароль через «Забыли пароль?».";
    case "E_EMAIL_NOT_VERIFIED":
      return "E-mail не подтверждён. Проверьте почту и перейдите по ссылке из письма.";
    default:
      return "Не удалось войти. Попробуйте ещё раз.";
  }
}

// Попытка извлечь код ошибки из ответа NextAuth
function extractCode(res: any): string | undefined {
  if (!res) return undefined;
  if (res.error && res.error !== "CredentialsSignin") return res.error;
  try {
    if (res.url) {
      const u = new URL(res.url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
      const err = u.searchParams.get("error");
      if (err && err.startsWith("E_")) return err;
    }
  } catch {}
  return res.error || undefined;
}

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
      // 1) Получаем HPT (установит HttpOnly cookie)
      await ensureHuman("login");

      // 2) Диагностика
      const probe = await fetch("/api/captcha/hpt", { cache: "no-store" })
        .then(r => r.json()).catch(() => ({}));

      // 3) Логин
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        ...(probe?.ok && probe?.hpt ? { hpt: probe.hpt } : {}),
      });

      if (res?.ok) {
        router.replace("/profile");
      } else {
        const code = extractCode(res);
        setError(mapError(code));
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
