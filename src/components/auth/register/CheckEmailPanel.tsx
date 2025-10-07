// src/components/auth/register/CheckEmailPanel.tsx
"use client";

import React, { useState } from "react";
import { ensureHuman } from "@/lib/captcha/ensureHuman";
import ResendButton from "./ResendButton";

export default function CheckEmailPanel({
  email,
  onBackToRegister,
}: {
  email: string;
  onBackToRegister?: () => void;
}) {
  const [hint] = useState(
    "Мы отправили письмо. Перейдите по ссылке из письма, чтобы завершить регистрацию."
  );

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 md:pt-3">
      <h2 className="text-xl font-semibold">Подтвердите e-mail</h2>
      <p className="mt-2 text-neutral-700">
        {hint} Адрес: <span className="font-medium">{email}</span>.
      </p>
      <ul className="mt-4 list-disc pl-5 text-neutral-700">
        <li>Проверьте папку «Спам» или «Промоакции».</li>
        <li>Если письма нет 1–2 минуты — нажмите «Отправить снова» ниже.</li>
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        <ResendButton email={email} />
        <button
          type="button"
          onClick={onBackToRegister}
          className="inline-flex items-center rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-50"
        >
          Изменить адрес
        </button>
      </div>
    </div>
  );
}
