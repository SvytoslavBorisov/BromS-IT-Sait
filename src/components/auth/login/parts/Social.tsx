// src/components/auth/login/parts/Social.tsx
"use client";

import { useEffect } from "react";
import { YandexTile } from "../../YandexButton";
import { signIn } from "next-auth/react";

export default function Social() {
  const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";

  useEffect(() => {
    if (!isLocalhost) {
      // Загружаем VKID SDK только на проде/HTTPS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js";
      script.async = true;
      script.onload = () => {
        if ("VKIDSDK" in window) {
          const VKID = (window as any).VKIDSDK;

          VKID.Config.init({
            app: 54194015,
            redirectUrl: "https://broms-it.ru/auth",
            responseMode: VKID.ConfigResponseMode.Callback,
            source: VKID.ConfigSource.LOWCODE,
            scope: "", // укажи нужные права, например "email"
          });

          const oneTap = new VKID.OneTap();
          oneTap.render({
            container: document.getElementById("vkid-widget-container"),
            showAlternativeLogin: true,
          })
          .on(VKID.WidgetEvents.ERROR, (err: any) => console.error("VKID Error:", err))
          .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, (payload: any) => {
            VKID.Auth.exchangeCode(payload.code, payload.device_id)
              .then((data: any) => console.log("VKID success:", data))
              .catch((err: any) => console.error("VKID auth error:", err));
          });
        }
      };
      document.body.appendChild(script);
    }
  }, [isLocalhost]);

  return (
    <div className="mt-7 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs text-neutral-500">или войдите через</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {isLocalhost ? (
          // fallback: обычная кнопка VK через next-auth на локале
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
        ) : (
          // VKID One Tap на проде
          <div id="vkid-widget-container" />
        )}

        {/* Яндекс всегда */}
        <YandexTile />
      </div>
    </div>
  );
}
