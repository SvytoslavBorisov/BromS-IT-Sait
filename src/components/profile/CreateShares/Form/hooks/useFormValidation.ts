"use client";

import { useMemo } from "react";
import { binom, secretStrength } from "../utils";

// УЗКИЙ тип вместо импорта из ".." — разрывает цикл
type CreateSharesFormStateLite = {
  title?: string;
  secret?: string;
  type: string;                 // например: "CUSTOM" | "RANDOM" | ...
  threshold?: number;
  selected: Set<string>;
};

export default function useFormValidation(state: CreateSharesFormStateLite) {
  const n = state.selected?.size ?? 0;
  const k = Math.min(Math.max(state.threshold ?? 1, 1), Math.max(n, 1));

  const combos = useMemo(() => binom(n, k), [n, k]);
  const strength = useMemo(
    () => secretStrength(state.secret ?? ""),
    [state.secret]
  );

  const errors = {
    title: !state.title?.trim() ? "Укажите название" : "",
    secret:
      state.type === "CUSTOM" && (!state.secret || state.secret.length < 8)
        ? "Секрет должен быть не короче 8 символов"
        : "",
    threshold:
      n > 0 && k > n
        ? "Порог не может быть больше числа выбранных участников"
        : n === 0
        ? "Выберите хотя бы одного участника"
        : "",
  };

  const isValid =
    !errors.title &&
    !errors.secret &&
    !errors.threshold &&
    (state.type !== "CUSTOM" || !!state.secret);

  return { errors, isValid, n, k, combos, strength };
}
