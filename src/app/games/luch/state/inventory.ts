// luch/state/inventory.ts
import { InventoryItem } from "../engine/types";

export function createDefaultInventory(): InventoryItem[] {
  return [
    { id: "itm-s-1", kind: "reflector_short", qty: 2, lengthPct: 0.12 },
    { id: "itm-l-1", kind: "reflector_long",  qty: 1, lengthPct: 0.20 },
    { id: "itm-a-1", kind: "reflector_arc",   qty: 1, arcRadiusPct: 0.10 },
  ];
}

export function spendItem(inv: InventoryItem[], kind: InventoryItem["kind"]) {
  return inv.map((it) =>
    it.kind === kind && it.qty > 0 ? { ...it, qty: it.qty - 1 } : it
  );
}
