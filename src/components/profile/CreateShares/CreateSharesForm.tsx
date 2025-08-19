"use client";

import { useEffect, useMemo, useState } from "react";
import { FileType, Participant } from "@/lib/crypto/shares";
import ParticipantsList from "@/components/profile/ParticipantsList";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Info, Search, X, CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  state: {
    title: string;
    secret: string;
    type: FileType;
    comment: string;
    expiresAt: string | null;
    threshold: number;
    selected: Set<string>;
    /** ДОБАВЛЕНО: галка для асимметричного типа */
    createCertForAsymmetric?: boolean;
  };
  setState: (partial: Partial<Props["state"]>) => void;
  participants: Participant[];
  onToggle: (id: string) => void;
}

export default function CreateSharesForm({
  state,
  setState,
  participants,
  onToggle,
}: Props) {
  // === Локальные состояния UI ===
  const [showSecret, setShowSecret] = useState(false);
  const [q, setQ] = useState(""); // поиск по участникам

  // === Вычисления ===
  const n = state.selected.size || 0;
  const k = Math.min(Math.max(state.threshold || 1, 1), Math.max(n, 1));
  const combos = useMemo(() => binom(n, k), [n, k]);

  // фильтрация участников
  const filtered = useMemo(() => {
    if (!q.trim()) return participants;
    const qq = q.trim().toLowerCase();
    return participants.filter((p) =>
      `${p.name ?? ""} ${p.email ?? ""} ${p.id}`.toLowerCase().includes(qq)
    );
  }, [participants, q]);

  const allFilteredIds = useMemo(() => filtered.map((p) => p.id), [filtered]);
  const allFilteredChecked = allFilteredIds.length > 0 && allFilteredIds.every((id) => state.selected.has(id));
  const someFilteredChecked = allFilteredIds.some((id) => state.selected.has(id));

  // === Хелперы ===
  const toggleAllFiltered = (checked: boolean) => {
    setState({
      selected: new Set(
        checked
          ? Array.from(new Set([...Array.from(state.selected), ...allFilteredIds]))
          : Array.from(state.selected).filter((id) => !allFilteredIds.includes(id))
      ),
      // если k > новое n — корректируем
      threshold: Math.min(k, checked ? new Set([...state.selected, ...allFilteredIds]).size : Math.max(1, Array.from(state.selected).filter((id) => !allFilteredIds.includes(id)).length)),
    });
  };

  const presetExpire = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const isoLocal = toLocalInputValue(d);
    setState({ expiresAt: isoLocal });
  };

  // === Валидация ===
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
    !errors.title && !errors.secret && !errors.threshold && (state.type !== "CUSTOM" || !!state.secret);

  // оценка «качества» секрета (грубая)
  const strength = secretStrength(state.secret);

  // === Безопасные изменения ===
  useEffect(() => {
    // если уменьшили количество выбранных — не даём k выходить за пределы
    if (k !== state.threshold) {
      setState({ threshold: k });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]); // при изменении выбранных

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Форма слева */}
      <div className="lg:col-span-8 space-y-5">
        {/* Заголовок */}
        <div className="rounded-2xl border p-4 shadow-sm bg-white/60">
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Название разделения
          </label>
          <input
            id="title"
            value={state.title}
            onChange={(e) => setState({ title: e.target.value })}
            className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 ${
              errors.title ? "border-red-400" : "border-gray-200"
            }`}
            placeholder="Например: «Ключ от сейфа проекта»"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "err-title" : undefined}
          />
          {errors.title ? (
            <p id="err-title" className="mt-2 text-xs text-red-600">
              {errors.title}
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3.5 w-3.5" />
              Дайте понятное имя, чтобы участники понимали контекст.
            </p>
          )}
        </div>

        {/* Тип */}
        <div className="rounded-2xl border p-4 shadow-sm bg-white/60">
          <label className="block text-sm font-medium mb-1">Тип разделения</label>
          <select
            value={state.type}
            onChange={(e) =>
              setState({
                type: e.target.value as FileType,
                // при переключении на CUSTOM если k>n — корректируем
                threshold: Math.min(k, Math.max(1, n)),
              })
            }
            className="border rounded-xl px-3 py-2 w-full outline-none focus:ring-2 focus:ring-black/10"
          >
            <option value="CUSTOM">Пользовательский (секрет в поле ниже)</option>
            <option value="ASYMMETRIC">Асимметричный (секрет — из ключа/сертификата)</option>
          </select>

          {state.type === "ASYMMETRIC" && (
            <div className="mt-3 flex items-center justify-between rounded-xl border px-3 py-3 bg-gray-50">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Создать сертификат</span>
                <span className="text-xs text-muted-foreground">
                  Если включить — будет сгенерирован X.509 и предложено скачать.
                </span>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={!!state.createCertForAsymmetric}
                  onChange={(e) => setState({ createCertForAsymmetric: e.target.checked })}
                />
                <span className="w-10 h-6 bg-gray-300 rounded-full relative transition-all peer-checked:bg-emerald-500">
                  <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-all peer-checked:left-4"></span>
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Секрет (только для CUSTOM) */}
        {state.type === "CUSTOM" && (
          <div className="rounded-2xl border p-4 shadow-sm bg-white/60">
            <div className="flex items-center justify-between">
              <label htmlFor="secret" className="block text-sm font-medium mb-1">
                Секрет
              </label>
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border hover:bg-gray-50"
                aria-pressed={showSecret}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showSecret ? "Скрыть" : "Показать"}
              </button>
            </div>

            <textarea
              id="secret"
              value={state.secret}
              onChange={(e) => setState({ secret: e.target.value })}
              className={`w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 ${
                errors.secret ? "border-red-400" : "border-gray-200"
              } ${!showSecret ? "blur-[3px] hover:blur-0 transition" : ""}`}
              rows={4}
              autoComplete="off"
              aria-invalid={!!errors.secret}
              aria-describedby={errors.secret ? "err-secret" : "hint-secret"}
            />

            {/* Индикатор «качества» */}
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full ${
                    strength.score >= 80
                      ? "bg-emerald-500"
                      : strength.score >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, strength.score))}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground min-w-20 text-right">
                {strength.label}
              </div>
            </div>

            {errors.secret ? (
              <p id="err-secret" className="mt-2 text-xs text-red-600">
                {errors.secret}
              </p>
            ) : (
              <p id="hint-secret" className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                Рекомендуется высокая энтропия: длинная строка, цифры/буквы/символы.
              </p>
            )}
          </div>
        )}

        {/* Комментарий + Срок */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl border p-4 shadow-sm bg-white/60">
            <label htmlFor="comment" className="block text-sm font-medium mb-1">
              Комментарий
            </label>
            <input
              id="comment"
              value={state.comment}
              onChange={(e) => setState({ comment: e.target.value })}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 border-gray-200"
              placeholder="Короткая заметка для участников"
            />
          </div>

          <div className="rounded-2xl border p-4 shadow-sm bg-white/60">
            <label htmlFor="expires" className="block text-sm font-medium mb-1">
              Время истечения
            </label>
            <div className="flex gap-2">
              <input
                id="expires"
                type="datetime-local"
                value={state.expiresAt ?? ""}
                onChange={(e) => setState({ expiresAt: e.target.value || null })}
                className="flex-1 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10 border-gray-200"
              />
              <Button type="button" variant="outline" onClick={() => presetExpire(7)}>
                +7д
              </Button>
              <Button type="button" variant="outline" onClick={() => presetExpire(30)}>
                +30д
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Оставьте пустым, если срок действия не нужен.
            </p>
          </div>
        </div>

        {/* Участники + Тулбар */}
        <fieldset className="rounded-2xl border p-4 shadow-sm bg-white/60">
          <legend className="text-sm font-medium px-1">Участники</legend>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по имени или email"
                className="pl-8 pr-8 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-black/10"
              />
              {q && (
                <button
                  type="button"
                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                  onClick={() => setQ("")}
                  aria-label="Очистить поиск"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => toggleAllFiltered(!allFilteredChecked)}
              >
                {allFilteredChecked ? "Снять все (фильтр)" : "Выбрать все (фильтр)"}
              </Button>
              <span className="text-sm text-muted-foreground">
                Выбрано: <b>{n}</b>
              </span>
            </div>
          </div>

          <ParticipantsList
            participants={filtered}
            selected={state.selected}
            onToggle={onToggle}
          />

          {/* Порог */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Порог восстановления (k из n)</label>
            <input
              type="range"
              min={1}
              max={Math.max(1, n)}
              value={k}
              onChange={(e) => setState({ threshold: Number(e.target.value) })}
              className="w-full"
            />
            <div className="mt-1 flex flex-wrap items-center justify-between text-sm">
              <div>
                k = <b>{k}</b>, n = <b>{n}</b>
                <span className="text-muted-foreground">, комбинаций: ~{combos}</span>
              </div>
              <div className="flex items-center gap-2">
                {n === 0 ? (
                  <span className="inline-flex items-center text-red-600">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Выберите участников
                  </span>
                ) : k === 1 ? (
                  <span className="inline-flex items-center text-amber-600">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Риск: любой один владелец восстановит секрет
                  </span>
                ) : k === n ? (
                  <span className="inline-flex items-center text-amber-600">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Требуются все участники — может быть неудобно
                  </span>
                ) : (
                  <span className="inline-flex items-center text-emerald-600">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Сбалансированный порог
                  </span>
                )}
              </div>
            </div>

            {errors.threshold && (
              <p className="mt-2 text-xs text-red-600">{errors.threshold}</p>
            )}
          </div>
        </fieldset>
      </div>

      {/* Резюме справа */}
      <aside className="lg:col-span-4">
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
              <li><span className="text-muted-foreground">Комбинаций C(n,k):</span> ~{combos}</li>
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
              <li className="text-muted-foreground">
                Кнопка «Создать» должна быть активна в контейнере только при валидной форме.
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ====================== utils ====================== */

function binom(n: number, k: number) {
  if (n < 0 || k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

function toLocalInputValue(d: Date) {
  // YYYY-MM-DDTHH:mm для <input type="datetime-local">
  const pad = (x: number) => String(x).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function secretStrength(s: string) {
  if (!s) return { score: 0, label: "пусто" };
  let variety = 0;
  if (/[a-z]/.test(s)) variety++;
  if (/[A-Z]/.test(s)) variety++;
  if (/[0-9]/.test(s)) variety++;
  if (/[^a-zA-Z0-9]/.test(s)) variety++;
  const lengthScore = Math.min(60, s.length * 3); // до 60 баллов за длину
  const varietyScore = variety * 10; // до 40 за разнообразие
  const score = Math.min(100, lengthScore + varietyScore);
  const label =
    score >= 80 ? "сильный" : score >= 50 ? "средний" : "слабый";
  return { score, label };
}
