import type { SBEvent } from "./types";

export const formatInt = (v: number) => `${Math.round(v)}`;
export const format1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

export function pct(a: number, b: number): number {
  const total = a + b;
  return total > 0 ? (a / total) * 100 : 50;
}

export function num(x: unknown): number {
  return typeof x === "number" && isFinite(x) ? x : 0;
}

export function normalizeXG(e: SBEvent): number {
  const s = e.shot;
  if (!s) return 0;
  return num(s.statsbomb_xg) || num(s.xg) || (s.is_goal ? 0.09 : 0);
}

export function isOnTarget(e: SBEvent): boolean {
  const s = e.shot;
  if (!s) return false;
  const name = s.outcome?.name?.toLowerCase() || "";
  return name === "goal" || name === "saved" || (s as any).is_goal === true;
}

export function isCompletedPass(e: SBEvent): boolean {
  if (!e.pass) return false;
  // У StatsBomb completion == отсутствие outcome
  return !e.pass.outcome;
}

export function isFoul(e: SBEvent): boolean {
  return Boolean(e.foul_committed);
}

export function cardType(e: SBEvent): "yellow" | "red" | null {
  const c: any = e.card;
  if (!c) return null;
  const name = (typeof c === "string" ? c : c?.name || c?.type?.name || "").toLowerCase();
  if (name.includes("yellow")) return "yellow";
  if (name.includes("red")) return "red";
  return null;
}
