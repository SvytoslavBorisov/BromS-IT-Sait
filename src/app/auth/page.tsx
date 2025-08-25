// src/app/auth/page.tsx
import { Metadata } from "next";
import AuthTabs from "./AuthTabs";

export const metadata: Metadata = {
  title: "Вход и регистрация",
  description: "Одна страница со вкладками: вход и регистрация",
};

export default function AuthPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      {/* мягкое сияние */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_40%_at_50%_0%,#000_20%,transparent_70%)]">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-[72rem] rounded-full blur-3xl opacity-40 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-400" />
      </div>

      {/* контент */}
      <div className="relative z-10 mx-auto w-full max-w-4xl xl:max-w-5xl px-3 sm:px-6 lg:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-12">
        <div className="rounded-3xl border border-white/10 bg-black/30 backdrop-blur-md shadow-2xl">
          <div className="px-4 py-6 sm:px-10 sm:py-10">
            <h1 className="text-center text-2xl sm:text-3xl lg:text-4xl font-semibold text-white">
              Добро пожаловать
            </h1>
            <p className="mt-2 text-center text-sm sm:text-base text-slate-300">
              Войдите в аккаунт или создайте новый — всё на одной странице.
            </p>

            <div className="mt-6 sm:mt-8">
              <AuthTabs />
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-slate-400">
          Защищено современными стандартами безопасности
        </div>
      </div>
    </div>
  );
}
