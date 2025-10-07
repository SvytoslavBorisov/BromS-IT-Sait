// src/app/auth/AuthTabs.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginForm from "@/components/auth/login/LoginForm";
import RegisterForm from "@/components/auth/register/RegisterForm";
import { ensureHuman } from "@/lib/captcha/ensureHuman";

import CheckEmailPanel from "@/components/auth/register/CheckEmailPanel";
import ForgotPanel from "@/components/auth/forgot/ForgotPanel";
import ResetSentPanel from "@/components/auth/forgot/ResetSentPanel";

type TabKey = "login" | "register";
type View =
  | { type: "form"; tab: TabKey }
  | { type: "checkEmail"; email: string }     // регистрация → подтвердите e-mail
  | { type: "forgot" }                         // форма забыли пароль
  | { type: "forgotSent"; email: string };     // забыли пароль → письмо отправлено

const tabs: { key: TabKey; label: string }[] = [
  { key: "login", label: "Вход" },
  { key: "register", label: "Регистрация" },
];

export default function AuthTabs() {
  const router = useRouter();
  const search = useSearchParams();

  const initialTab = useMemo<TabKey>(() => {
    const q = (search?.get("tab") || "").toLowerCase();
    return q === "register" ? "register" : "login";
  }, [search]);

  const [view, setView] = useState<View>({ type: "form", tab: initialTab });
  useEffect(() => setView({ type: "form", tab: initialTab }), [initialTab]);

  const setTab = (key: TabKey) => {
    setView({ type: "form", tab: key });
    const params = new URLSearchParams(Array.from(search?.entries() ?? []));
    params.set("tab", key);
    params.delete("stage");
    params.delete("email");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const goCheckEmail = (email: string) => {
    setView({ type: "checkEmail", email });
    const params = new URLSearchParams(Array.from(search?.entries() ?? []));
    params.set("tab", "register");
    params.set("stage", "check-email");
    params.set("email", email);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const goForgot = () => {
    setView({ type: "forgot" });
    const params = new URLSearchParams(Array.from(search?.entries() ?? []));
    params.set("tab", "login"); // логически остаёмся в контексте логина
    params.set("stage", "forgot");
    params.delete("email");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const goForgotSent = (email: string) => {
    setView({ type: "forgotSent", email });
    const params = new URLSearchParams(Array.from(search?.entries() ?? []));
    params.set("tab", "login");
    params.set("stage", "forgot-sent");
    params.set("email", email);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // deep-link поддержка (stage в query)
  useEffect(() => {
    const stage = (search?.get("stage") || "").toLowerCase();
    const email = (search?.get("email") || "").trim();

    if (stage === "check-email" && email) {
      setView({ type: "checkEmail", email });
      return;
    }

    if (stage === "forgot") {
      setView({ type: "forgot" });
      return;
    }

    if (stage === "forgot-sent" && email) {
      setView({ type: "forgotSent", email });
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Табы */}
      <div className="flex">
        <div
          role="tablist"
          aria-label="Выбор формы"
          className="flex w-full rounded-none border-0 bg-transparent sm:inline-flex sm:w-auto sm:mx-auto sm:gap-2"
        >
          {tabs.map((t) => {
            const isActive =
              view.type === "form"
                ? t.key === view.tab
                : // любые внеформенные состояния визуально подсвечивают "Регистрацию" только для checkEmail.
                  view.type === "checkEmail"
                ? t.key === "register"
                : t.key === "login"; // forgot/forgotSent — контекст логина

            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${t.key}`}
                onClick={() => setTab(t.key)}
                className={[
                  "relative px-4 py-3 text-base font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300",
                  "flex-1 rounded-none sm:flex-none sm:rounded-none",
                  isActive
                    ? "text-neutral-900 after:absolute after:inset-x-0 after:-bottom-[1px] after:h-[2px] after:bg-neutral-900"
                    : "text-neutral-600 hover:text-neutral-800",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Контент */}
      <div className="mt-3 sm:mt-6 px-2 md:px-0">
        <FadeSwitch key={keyForView(view)}>
          <section
            id={`panel-${panelIdForView(view)}`}
            role="tabpanel"
            className="md:min-h-[560px]"
          >
            {/* Вход */}
            {view.type === "form" && view.tab === "login" && (
              <LoginForm onForgot={goForgot} />
            )}

            {/* Регистрация */}
            {view.type === "form" && view.tab === "register" && (
              <RegisterForm onRegistered={(email) => goCheckEmail(email)} />
            )}

            {/* Регистрация → Проверка e-mail */}
            {view.type === "checkEmail" && (
              <CheckEmailPanel
                email={view.email}
                onBackToRegister={() => setTab("register")}
              />
            )}

            {/* Забыли пароль → форма */}
            {view.type === "forgot" && (
              <ForgotPanel
                onCancel={() => setTab("login")}
                onSent={(email) => goForgotSent(email)}
              />
            )}

            {/* Забыли пароль → письмо отправлено */}
            {view.type === "forgotSent" && (
              <ResetSentPanel
                email={view.email}
                onBackToLogin={() => setTab("login")}
                onResend={async () => {
                  await ensureHuman("forgot");
                  // повторный вызов того же API
                  await fetch("/api/auth/forgot", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ email: view.email }),
                  });
                }}
              />
            )}
          </section>
        </FadeSwitch>
      </div>
    </div>
  );
}

function keyForView(view: View) {
  if (view.type === "form") return view.tab;
  if (view.type === "checkEmail") return "check-email";
  if (view.type === "forgot") return "forgot";
  return "forgot-sent";
}

function panelIdForView(view: View) {
  if (view.type === "form") return view.tab;
  if (view.type === "checkEmail") return "register";
  return "login";
}

function FadeSwitch({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className="transition duration-300 ease-out will-change-transform"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? 0 : 8}px)`,
      }}
    >
      {children}
    </div>
  );
}
