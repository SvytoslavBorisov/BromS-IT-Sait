"use client";

import React from "react";
import { InventoryItem, InventoryItemKind } from "../engine/types";

export type InventoryProps = {
  items: InventoryItem[];
  placeMode: InventoryItemKind | null;
  onPick: (kind: InventoryItemKind) => void;
  onCancel: () => void;
  compact?: boolean;
};

/** Инвентарь без оверлеев — внизу страницы, рядом с SettingsPanel */
export default function Inventory({ items, placeMode, onPick, onCancel, compact }: InventoryProps) {
  return (
    <div
      style={{
        padding: compact ? "10px 12px" : "12px 16px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)",
        background: "linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.02))",
        display: "flex",
        gap: 12,
        alignItems: "stretch",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div style={{ fontWeight: 700, opacity: 0.9, whiteSpace: "nowrap", alignSelf: "center" }}>
        Инвентарь
      </div>

      {items.map((it) => {
        const active = placeMode && it.kind === placeMode;
        return (
          <button
            key={it.id}
            disabled={it.qty <= 0}
            onPointerDown={(e) => { e.preventDefault(); onPick(it.kind); }}
            style={{
              minWidth: compact ? 120 : 160,
              padding: compact ? "12px 12px" : "12px 14px",
              borderRadius: 14,
              border: active
                ? "1px solid rgba(124,214,255,0.6)"
                : "1px solid rgba(255,255,255,0.14)",
              background: it.qty > 0
                ? (active ? "rgba(124,214,255,0.10)" : "rgba(255,255,255,0.06)")
                : "rgba(255,255,255,0.04)",
              color: "#e6edf3",
              opacity: it.qty > 0 ? 1 : 0.5,
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: compact ? 14 : 16 }}>
              {it.kind === "reflector_short" ? "Отражатель — короткий"
                : it.kind === "reflector_long" ? "Отражатель — длинный"
                : "Отражатель — арочный"}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              {it.kind === "reflector_long" ? "Дальние траектории" :
               it.kind === "reflector_short" ? "Точная юстировка" : "Экспериментальный"}
            </div>
            <div style={{ marginTop: 6, fontSize: 12 }}>
              Осталось: <b>{it.qty}</b>
            </div>
          </button>
        );
      })}

      {placeMode && (
        <button
          onPointerDown={onCancel}
          style={{
            marginLeft: "auto",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,120,120,0.16)",
            color: "#ffd7d7",
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          Отмена установки
        </button>
      )}
    </div>
  );
}
