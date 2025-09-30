// src/components/auth/login/LoginForm.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useLogin } from "@/hooks/useLogin";
import { useSearchParams } from "next/navigation";
import Header from "./parts/Header";
import EmailNotVerified from "./parts/EmailNotVerified";
import EmailField from "./parts/EmailField";
import PasswordField from "./parts/PasswordField";
import SubmitButton from "./parts/SubmitButton";
import Links from "./parts/Links";
import Social from "./parts/Social";
import { ensureHuman } from "@/lib/captcha/ensureHuman";


export default function LoginForm() {
  const {
    email, setEmail,
    password, setPassword,
    showPass, toggleShowPass,
    loading, error, setError,
    handleSubmit,
  } = useLogin();

  const params = useSearchParams();
  const queryError = params.get("error");
  const shouldShowGenericError = !!error && queryError !== "EmailNotVerified";

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await ensureHuman("login");
      await handleSubmit(e);
    } catch {
      setError("Подтвердите, что вы не бот, и попробуйте снова.");
    }
  }, [handleSubmit, setError]);

  const handleResend = useCallback(async () => {
    setResendLoading(true);
    setResendMsg(null);
    try {
      await ensureHuman("resend");
      const resp = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json().catch(() => ({}));
      setResendMsg(resp.ok ? (data?.message || "Письмо отправлено.") : (data?.message || "Не удалось отправить письмо."));
    } catch {
      setResendMsg("Подтвердите, что вы не бот и попробуйте снова.");
    } finally {
      setResendLoading(false);
    }
  }, [email]);

  return (
    <div
      className="
        w-full
        rounded-none border-0 shadow-none bg-transparent
        md:rounded-3xl md:border-0 md:bg-white/70 md:backdrop-blur-sm md:shadow-lg
      "
    >
      <div className="px-2 md:px-8">
        <Header title="Вход в аккаунт" icon="login" />
      </div>

      <div className="hidden md:block mx-8 mt-6 border-t border-neutral-100" />

      <div className="px-2 md:p-8">
        {queryError === "EmailNotVerified" && (
          <EmailNotVerified
            resendLoading={resendLoading}
            resendMsg={resendMsg}
            onResend={handleResend}
            emailPresent={!!email}
          />
        )}

        {shouldShowGenericError && (
          <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <EmailField
            value={email}
            onChange={(v) => { setEmail(v); if (error) setError(null); }}
          />
          <PasswordField
            value={password}
            onChange={(v) => { setPassword(v); if (error) setError(null); }}
            show={showPass}
            onToggleShow={toggleShowPass}
          />
          <SubmitButton loading={loading} />
          <Links />
        </form>

        {/* Социальные кнопки через next-auth */}
        <Social />

      </div>
    </div>
  );
}
