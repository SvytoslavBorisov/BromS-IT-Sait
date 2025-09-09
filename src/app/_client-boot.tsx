"use client";

import { useEffect } from "react";

export default function ClientBoot() {
  useEffect(() => {
    // 1) Не даём браузеру самовольно восстанавливать позицию
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    // 2) Включаем smooth-scroll, если пользователь не просил reduce motion
    const root = document.documentElement;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!m.matches) root.classList.add("scroll-smooth");
    else root.classList.remove("scroll-smooth");

    // 3) Фикс мобильного вьюпорта: безопасная высота
    const setSVH = () => root.style.setProperty("--svh", `${window.innerHeight}px`);
    setSVH();
    window.addEventListener("resize", setSVH, { passive: true });

    // 4) Анти-джамп к #hash при первой загрузке
    if (location.hash) {
      const restore = () => {
        const id = decodeURIComponent(location.hash.slice(1));
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: m.matches ? "auto" : "smooth", block: "start" });
      };
      // Сначала уводим в (0,0), затем мягко скроллим сами
      window.scrollTo(0, 0);
      const raf = requestAnimationFrame(() => setTimeout(restore, 250));
      const onFirst = () => { cancelAnimationFrame(raf); setTimeout(restore, 0); cleanup(); };
      const cleanup = () => {
        window.removeEventListener("wheel", onFirst);
        window.removeEventListener("touchstart", onFirst);
      };
      window.addEventListener("wheel", onFirst, { passive: true });
      window.addEventListener("touchstart", onFirst, { passive: true });
      return () => {
        window.removeEventListener("resize", setSVH);
        cleanup();
      };
    }

    return () => {
      window.removeEventListener("resize", setSVH);
    };
  }, []);

  return null;
}
