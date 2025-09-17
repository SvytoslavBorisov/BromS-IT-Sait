"use client";

import React, { useEffect, useMemo } from "react";
import { InventoryItem, InventoryItemKind } from "../engine/types";

export type InventoryProps = {
  items: InventoryItem[];
  placeMode: InventoryItemKind | null;
  onPick: (kind: InventoryItemKind) => void;
  onCancel: () => void;
  compact?: boolean;
};

/** Инвентарь HUD: быстрый выбор, подсказка, hotkeys 1..9 */
export default function Inventory({
  items, placeMode, onPick, onCancel, compact,
}: InventoryProps) {
  // Горячие клавиши (1..9) — выбирают соответствующий предмет
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 9) {
        const idx = n - 1;
        const it = items[idx];
        if (it && it.qty > 0) onPick(it.kind);
      }
      if (e.key.toLowerCase() === "escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, onPick, onCancel]);

  const tips = useMemo(
    () => [
      "Короткий отражатель — для ювелирной доводки угла.",
      "Длинный удобен для быстрых дальних траекторий.",
      "Арочный помогает огибать препятствия необычными путями.",
      "Ищи кратчайший путь — длина луча влияет на рекорд.",
      "Зажимай Alt при вращении (если поддержано) для маленьких шагов.",
    ],
    []
  );
  const tip = tips[(items.length * 13) % tips.length];

  return (
    <div
      className={[
        "w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm",
        "shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/5",
        compact ? "px-3 py-2" : "px-4 py-3",
        "text-sm",
      ].join(" ")}
    >
      {/* Верхняя строка: заголовок + подсказка + отмена */}
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white/80">
          Инвентарь
        </span>
        <span className="hidden md:inline text-white/70">{tip}</span>

        <div className="ms-auto flex items-center gap-2">
          {placeMode && (
            <button
              onClick={onCancel}
              className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-white/90 hover:bg-white/10 active:scale-[0.99] transition"
              title="Отмена установки (Esc)"
            >
              Отмена (Esc)
            </button>
          )}
        </div>
      </div>

      {/* Слот-кнопки */}
      <div className="flex items-stretch gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none]">
        {/* скрываем скроллбары в WebKit */}
        <style jsx>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

        {items.map((it, idx) => {
          const active = placeMode === it.kind;
          const disabled = it.qty <= 0;

          return (
            <button
              key={it.id}
              disabled={disabled}
              onPointerDown={(e) => { e.preventDefault(); onPick(it.kind); }}
              className={[
                "group relative flex min-w-[9.5rem] flex-col justify-between",
                "rounded-xl border px-3 py-2 text-left",
                disabled
                  ? "border-white/10 bg-white/5 opacity-50 cursor-not-allowed"
                  : active
                    ? "border-cyan-300/50 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(124,214,255,0.25)_inset,0_8px_22px_rgba(124,214,255,0.14)]"
                    : "border-white/15 bg-white/5 hover:bg-white/10",
                "transition",
              ].join(" ")}
              title={`Быстрый выбор: ${idx + 1}`}
            >
              {/* Верхняя строка: иконка + название */}
              <div className="flex items-center gap-2">
                <IconFor kind={it.kind} active={!!active} />
                <div className="font-extrabold leading-tight text-white/90">
                  {labelFor(it.kind)}
                </div>
              </div>

              {/* Описание */}
              <div className="mt-1 text-[12px] text-white/70">
                {descFor(it.kind)}
              </div>

              {/* Нижняя строка: кол-во + хоткей */}
              <div className="mt-2 flex items-center justify-between text-[12px]">
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-white/80">
                  Осталось: <b className="text-white/95">{it.qty}</b>
                </span>
                <span className="rounded-md border border-white/20 px-1.5 py-0.5 text-white/70">
                  {idx + 1}
                </span>
              </div>

              {/* Активное свечение по краям */}
              {active && (
                <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-cyan-300/50" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Мини-иконки отражателей (SVG), без лишней нагрузки */
function IconFor({ kind, active }: { kind: InventoryItemKind; active: boolean }) {
  const base = "transition";
  const stroke = active ? "stroke-cyan-300" : "stroke-white/70";
  const fill = active ? "fill-cyan-300/20" : "fill-white/5";

  if (kind === "reflector_short") {
    return (
      <svg viewBox="0 0 40 24" className={`h-6 w-10 ${base}`}>
        <rect x="6" y="9" width="18" height="6" rx="2" className={`${fill} ${stroke}`} strokeWidth="2" />
        <path d="M28 6 L36 12 L28 18" className={stroke} strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (kind === "reflector_long") {
    return (
      <svg viewBox="0 0 56 24" className={`h-6 w-14 ${base}`}>
        <rect x="6" y="7" width="30" height="10" rx="2" className={`${fill} ${stroke}`} strokeWidth="2" />
        <path d="M42 6 L50 12 L42 18" className={stroke} strokeWidth="2" fill="none" />
      </svg>
    );
  }
  // reflector_arch
  return (
    <svg viewBox="0 0 40 24" className={`h-6 w-10 ${base}`}>
      <path d="M6 16 C 14 4, 26 4, 34 16" className={stroke} strokeWidth="2" fill="none" />
      <circle cx="20" cy="10" r="3" className={fill} />
    </svg>
  );
}

function labelFor(kind: InventoryItemKind) {
  switch (kind) {
    case "reflector_short":
      return "Отражатель — короткий";
    case "reflector_long":
      return "Отражатель — длинный";
    default:
      return "Отражатель — арочный";
  }
}

function descFor(kind: InventoryItemKind) {
  switch (kind) {
    case "reflector_short":
      return "Точная юстировка траектории";
    case "reflector_long":
      return "Дальние прямые пути";
    default:
      return "Необычные обходные маршруты";
  }
}
