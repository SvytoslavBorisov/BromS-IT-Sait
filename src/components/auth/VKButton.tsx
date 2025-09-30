// components/auth/VKButton.tsx
"use client";
import { signIn } from "next-auth/react";

export function VKTile() {
  return (
    <button
      onClick={() => signIn("vk", { callbackUrl: "/auth/after-oauth?next=/profile" })}
      className="group relative flex items-center justify-center h-12 rounded-2xl bg-[#0077FF] text-white
                 ring-1 ring-black/10 hover:ring-black/20 transition overflow-hidden
                 hover:scale-[1.03] active:scale-[0.98] duration-200 ease-out"
      aria-label="Войти через ВКонтакте"
    >
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-500
                       bg-gradient-to-r from-white/0 via-white/15 to-white/0" />
      <span className="text-xl font-black leading-none transform group-hover:scale-110 transition-transform">
        VK
      </span>
    </button>
  );
}
