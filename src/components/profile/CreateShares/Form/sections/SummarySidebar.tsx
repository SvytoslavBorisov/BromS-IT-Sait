"use client";

import { CreateSharesFormState } from "..";

export default function SummarySidebar({
  state, n, k, combos, errors, isValid,
}: {
  state: CreateSharesFormState;
  n: number;
  k: number;
  combos: number;
  errors: Record<string, string>;
  isValid: boolean;
}) {
  return (
    <div className="sticky top-4 space-y-4">
      <div className="rounded-2xl border p-4 shadow-sm bg-white/60">
        <h3 className="font-semibold mb-2">Итоги</h3>
        <ul className="text-sm space-y-1">
          <li><span className="text-muted-foreground">Название:</span> {state.title || "—"}</li>
          <li><span className="text-muted-foreground">Тип:</span> {state.type}</li>
          {state.type === "ASYMMETRIC" && (
            <li>
              <span className="text-muted-foreground">Сертификат:</span>{" "}
              {state.createCertForAsymmetric ? "Создавать" : "Не создавать"}
            </li>
          )}
          <li><span className="text-muted-foreground">Комментарий:</span> {state.comment || "—"}</li>
          <li><span className="text-muted-foreground">Истечение:</span> {state.expiresAt || "—"}</li>
          <li><span className="text-muted-foreground">Участники:</span> {n}</li>
          <li><span className="text-muted-foreground">Порог k:</span> {k}</li>
          <li><span className="text-muted-foreground">C(n,k):</span> ~{combos}</li>
        </ul>
      </div>

      <div className="rounded-2xl border p-4 shadow-sm bg-white/60">
        <h3 className="font-semibold mb-2">Статус формы</h3>
        <ul className="text-sm space-y-1">
          <li className={errors.title ? "text-red-600" : "text-emerald-600"}>
            {errors.title ? "Название не заполнено" : "Название ок"}
          </li>
          {state.type === "CUSTOM" && (
            <li className={errors.secret ? "text-red-600" : "text-emerald-600"}>
              {errors.secret ? "Секрет слишком короткий" : "Секрет ок"}
            </li>
          )}
          <li className={errors.threshold ? "text-red-600" : "text-emerald-600"}>
            {errors.threshold ? errors.threshold : "Порог ок"}
          </li>
          <li className={isValid ? "text-emerald-600" : "text-red-600"}>
            {isValid ? "Форма валидна" : "Исправьте ошибки выше"}
          </li>
        </ul>
      </div>
    </div>
  );
}
