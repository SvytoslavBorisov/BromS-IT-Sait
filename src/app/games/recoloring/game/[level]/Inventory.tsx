"use client";
import React from "react";
import { InventoryItem, InventoryItemKind, maskToHex, C } from "./types";

export type InventoryProps = {
  items: InventoryItem[];
  onPick: (kind: InventoryItemKind) => void;
  compact?: boolean;
};

const KIND_META: Record<InventoryItemKind, { label: string; desc: string }> = {
  reflector_short: { label: "Короткий отражатель", desc: "Небольшой сегмент зеркала" },
  reflector_long:  { label: "Длинный отражатель",  desc: "Длинный сегмент для сложных траекторий" },
  reflector_arc:   { label: "Арочный отражатель",  desc: "Слабо изогнутый (пока упрощён как прямой)" },
};

export default function Inventory({ items, onPick, compact }: InventoryProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: 12, right: 12, bottom: 12,
        zIndex: 50,                 // <-- поверх поля
        pointerEvents: "auto",      // <-- кликабельно
        display: "flex",
        gap: 10,
        padding: compact ? "8px 10px" : "12px",
        borderRadius: 14,
        background: "rgba(20,20,28,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(10px)",
        alignItems: "stretch",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {items.map((it) => (
        <button
          key={it.id}
          disabled={it.qty <= 0}
          onPointerDown={(e) => { e.preventDefault(); onPick(it.kind); }}
          style={{
            flex: "0 0 auto",
            minWidth: compact ? 90 : 120,
            padding: compact ? "8px 10px" : "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: it.qty > 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)",
            color: "#e6edf3",
            opacity: it.qty > 0 ? 1 : 0.5,
            textAlign: "left",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: compact ? 12 : 14 }}>
            {KIND_META[it.kind].label}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{KIND_META[it.kind].desc}</div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>
            Осталось: <b>{it.qty}</b>
          </div>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 36, height: 6, borderRadius: 6,
                           background: "linear-gradient(90deg, #7cd6ff, #fff)" }} />
            <span style={{ width: 10, height: 10, borderRadius: 999,
                           background: maskToHex(C.R | C.B), opacity: .5 }} />
          </div>
        </button>
      ))}
    </div>
  );
}
