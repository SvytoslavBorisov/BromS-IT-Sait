import { Metadata } from "next";
import AuthTabs from "./AuthTabs";
import ClientBg from "./ClientBg";

export const metadata: Metadata = {
  title: "Вход и регистрация",
  description: "Одна страница со вкладками: вход и регистрация",
};

export default function AuthPage() {
  return (
    <div className="relative min-h-[100svh] bg-white overflow-hidden">
      <ClientBg />

      <div className="relative flex min-h-[100svh] flex-col z-10">
        {/* Мобайл: заголовок вверху страницы */}
        <header className="px-4 pt-6 pb-3 md:hidden">
          <h1 className="text-center text-2xl font-semibold text-neutral-900">
            Добро пожаловать!
          </h1>
        </header>

        {/* Десктоп: центр + заголовок над формой */}
        <main
          className="
            flex-1 px-0
            md:flex md:items-center md:justify-center md:px-10
            pb-[calc(env(safe-area-inset-bottom)+56px)] md:pb-0
          "
        >
          <div className="w-full md:max-w-xl md:mx-auto">
            <div className="hidden md:block mb-4">
              <h1 className="text-center text-3xl font-semibold text-neutral-900">
                Добро пожаловать!
              </h1>
            </div>

            {/* Фикс от “скачков” при смене вкладок */}
            <div
            >
              <AuthTabs />
            </div>

            <div className="hidden md:block mt-6 text-center text-sm text-neutral-500">
              Защищено современными стандартами безопасности
            </div>
          </div>
        </main>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 text-center text-xs text-neutral-500 bg-white/80 backdrop-blur-md py-3 px-4 ring-1 ring-black/5">
        Защищено современными стандартами безопасности
      </div>
    </div>
  );
}
