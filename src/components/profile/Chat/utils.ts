import type { Message } from "./types";

export function isPromise<T = unknown>(x: any): x is Promise<T> {
  return x && typeof x.then === "function";
}

export function dedupeMsgs(arr: Message[]) {
  const seen = new Set<string>();
  const out: Message[] = [];
  for (const m of arr) {
    const key = `${m.ts}:${m.userId ?? m.userName ?? ""}:${m.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(m);
    }
  }
  return out;
}

export function groupByDay(msgs: Message[]) {
  const by: Record<string, Message[]> = {};
  for (const m of msgs) {
    const day = dayLabel(m.ts);
    by[day] ??= [];
    by[day].push(m);
  }
  return Object.entries(by)
    .map(([day, items]) => ({ day, items }))
    .sort((a, b) => (a.items[0]?.ts ?? 0) - (b.items[0]?.ts ?? 0));
}

export function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth(), da = today.getDate();
  const isToday = d.getFullYear() === y && d.getMonth() === m && d.getDate() === da;

  const yesterday = new Date();
  yesterday.setDate(da - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  if (isToday) return "Сегодня";
  if (isYesterday) return "Вчера";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: d.getFullYear() !== y ? "numeric" : undefined,
  });
}

export function timeHHMM(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function initials(name?: string) {
  const s = (name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[1]![0]).toUpperCase();
}
