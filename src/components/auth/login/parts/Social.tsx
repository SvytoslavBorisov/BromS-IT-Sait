"use client";

import { useEffect, useRef } from "react";
import { signIn } from "next-auth/react";
import { YandexButton } from "../../YandexButton";

const isProd = process.env.NODE_ENV === "production";

export default function Social() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isProd) return;

    // грузим VK SDK
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@vkid/sdk@^3/dist-sdk/umd/index.js";
    script.async = true;

    // переменные для снятия подписок и корректной зачистки
    let offError: (() => void) | null = null;
    let offLogin: (() => void) | null = null;
    let vkOneTap: any = null;

    const onLoad = () => {
      try {
        const VKID = (window as any).VKID || (window as any).VKIDSDK;
        if (!VKID || !containerRef.current) return;

        VKID.Config.init({
          app: 54194015,
          redirectUrl: "https://broms-it.ru/auth/after-oauth",
          responseMode: VKID.ConfigResponseMode.Callback,
          source: VKID.ConfigSource.LOWCODE,
          scope: "",
        });

        vkOneTap = new VKID.OneTap();
        const widget = vkOneTap.render({
          container: containerRef.current,
          showAlternativeLogin: true,
        });

        // запоминаем off-функции, если SDK их возвращает
        offError = widget.on?.(VKID.WidgetEvents.ERROR, () => {});
        offLogin = widget.on?.(
          VKID.OneTapInternalEvents.LOGIN_SUCCESS,
          (payload: { code: string; device_id: string }) => {
            VKID.Auth.exchangeCode(payload.code, payload.device_id).catch(() => {});
          }
        );
      } catch {
        // игнор — просто не монтируем виджет
      }
    };

    const onError = () => {};

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    document.body.appendChild(script);

    return () => {
      // 1) снимаем слушатели SDK
      try { offError && offError(); } catch {}
      try { offLogin && offLogin(); } catch {}
      try { vkOneTap?.destroy?.(); } catch {}

      // 2) чистим контейнер ДО того, как React начнёт трогать детей
      if (containerRef.current) {
        try {
          containerRef.current.replaceChildren(); // безопасно удаляет всех потомков
        } catch {}
      }

      // 3) убираем <script>
      try {
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
        script.remove();
      } catch {}
    };
  }, []);

  return (
    <div className="mt-8 space-y-5">
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs text-neutral-500">или войдите через</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      {/* мобила: колонка; ≥sm: в ряд */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* VK блок: DEV — кнопка, PROD — контейнер для OneTap */}
        <div className="flex-1 min-w-0">
          {isProd ? (
            <div
              ref={containerRef}
              className="h-12 w-full flex items-center justify-center"
            />
          ) : (
            <button
              onClick={() =>
                signIn("vk", { callbackUrl: "/auth/after-oauth?next=/profile" })
              }
              className="w-full h-12 rounded-2xl bg-[#0077FF] text-white font-medium
                         ring-1 ring-black/10 hover:ring-black/20 transition
                         hover:brightness-110 active:scale-[0.98]"
              aria-label="Войти через VK ID"
            >
              Войти через VK ID
            </button>
          )}
        </div>

        {/* Яндекс */}
        <div className="flex-1 min-w-0">
          <YandexButton className="w-full h-12 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
