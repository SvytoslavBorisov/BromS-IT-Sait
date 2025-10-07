"use client";

import React from "react";
import ForgotForm from "./ForgotForm";

export default function ForgotPanel({
  onCancel,
  onSent,
}: {
  onCancel: () => void;
  onSent: (email: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8">
      <h1 className="text-lg md:text-xl font-semibold text-neutral-900">
        Восстановление пароля
      </h1>
      <p className="mt-2 text-sm text-neutral-600">
        Укажите e-mail — отправим ссылку для сброса пароля.
      </p>

      <div className="mt-6">
        <ForgotForm onCancel={onCancel} onSent={onSent} />
      </div>
    </div>
  );
}
