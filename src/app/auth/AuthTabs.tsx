// src/app/auth/AuthTabs.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginForm from "@/components/auth/login/LoginForm";
import RegisterForm from "@/components/auth/register/RegisterForm";

type TabKey = "login" | "register";
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

  const [active, setActive] = useState<TabKey>(initialTab);
  useEffect(() => setActive(initialTab), [initialTab]);

  const setTab = (key: TabKey) => {
    setActive(key);
    const params = new URLSearchParams(Array.from(search?.entries() ?? []));
    params.set("tab", key);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

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
            const isActive = t.key === active;
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

      {/* Контент с анимацией появления */}
      <div className="mt-3 sm:mt-6 px-2 md:px-0">
        <FadeSwitch key={active}>
          <section id={`panel-${active}`} role="tabpanel" className="md:min-h-[560px]">
            {active === "login" ? <LoginForm /> : <RegisterForm />}
          </section>
        </FadeSwitch>
      </div>
    </div>
  );
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
