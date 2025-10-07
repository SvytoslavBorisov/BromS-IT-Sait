"use client";

import { signIn } from "next-auth/react";
import clsx from "clsx";

export function YandexButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() =>
        signIn("yandex", { callbackUrl: "/auth/after-oauth?next=/profile" })
      }
      className={clsx(
        "group relative flex items-center justify-center bg-[#FF0000] text-white",
        "ring-1 ring-black/10 hover:ring-black/20 transition",
        "hover:brightness-110 active:scale-[0.98] font-medium",
        className
      )}
      aria-label="Войти через Яндекс"
    >
      <span
        className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500
                   bg-gradient-to-r from-white/0 via-white/10 to-white/0"
      />
      {/* «Я» слева + подпись — можно заменить на иконку */}
      <span className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-white text-[#FF0000] font-black">
          Я
        </span>
        <span>Войти через Яндекс</span>
      </span>
    </button>
  );
}
