"use client";
import { useEffect, useState } from "react";

export function CookieBanner() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("cookieAccepted")) setOpen(true);
  }, []);
  if (!open) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl bg-white/90 backdrop-blur-md ring-1 ring-black/10 p-4 shadow-lg">
      <p className="text-sm text-neutral-800">
        Мы используем cookie для улучшения сервиса. Продолжая, вы принимаете политику обработки данных.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <a href="/privacy" className="text-sm underline text-neutral-600">Подробнее</a>
        <button
          onClick={() => { localStorage.setItem("cookieAccepted","1"); setOpen(false); }}
          className="rounded-full bg-neutral-900 text-white text-sm px-4 py-1.5"
        >
          Принять
        </button>
      </div>
    </div>
  );
}
