"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

type TabKey = "login" | "register";
const tabs: { key: TabKey; label: string }[] = [
  { key: "login", label: "Вход" },
  { key: "register", label: "Регистрация" },
];

export default function AuthTabs() {
  const router = useRouter();
  const search = useSearchParams();

  // начальная вкладка из URL
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
      {/* Липкие и крупные вкладки на телефоне */}
      <div className="sticky top-[max(0px,env(safe-area-inset-top))] z-20 -mx-4 sm:mx-0 mb-4 sm:mb-6 bg-transparent/0">
        <div className="mx-4 sm:mx-0 grid grid-cols-2 rounded-2xl bg-white/5 p-1 ring-1 ring-white/10 shadow-lg">
          {tabs.map((t) => {
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  "relative w-full rounded-xl px-4 py-3 sm:py-3.5 text-base sm:text-lg font-medium transition",
                  "touch-manipulation", // удобнее тапать
                  isActive
                    ? "bg-white text-black shadow"
                    : "text-slate-200 hover:bg-white/10",
                ].join(" ")}
                aria-pressed={isActive}
                aria-current={isActive ? "page" : undefined}
              >
                {t.label}
                {isActive && (
                  <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-black/10" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Контент вкладок.
          ВАЖНО: формы сами белые — мы их не перекрашиваем.
          Делаем аккуратную «рамку» и мягкую тень вокруг, без второго фона. */}
      <div className="relative mt-2">
        <FadeSwitch key={active}>
          <div className="rounded-3xl p-[1px] bg-gradient-to-br from-white/15 via-white/5 to-transparent">
            <div className="rounded-3xl ring-1 ring-white/10 backdrop-blur-[2px]">
              {/* Внутренние отступы адаптивные:
                  на мобиле форму растягиваем почти во всю ширину экрана */}
              <div className="-mx-2 sm:mx-0">
                <div className="p-0 sm:p-2 lg:p-4 drop-shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                  {/* Здесь вставляем сами формы (они белые) */}
                  {active === "login" ? <LoginForm /> : <RegisterForm />}
                </div>
              </div>
            </div>
          </div>
        </FadeSwitch>
      </div>

      <p className="mt-4 text-center text-xs sm:text-sm text-slate-400">
        Нажимая продолжить, вы соглашаетесь с условиями сервиса и политикой конфиденциальности.
      </p>
    </div>
  );
}

/** Плавная смена форм */
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
