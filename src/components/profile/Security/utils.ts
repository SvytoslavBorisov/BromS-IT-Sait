import { Level, LogEntry } from "@/types/logs";

export const levelStyle: Record<Level, string> = {
  debug: "bg-gray-100 text-gray-700 ring-gray-300",
  info:  "bg-cyan-100 text-cyan-900 ring-cyan-300",
  warn:  "bg-amber-100 text-amber-900 ring-amber-300",
  error: "bg-rose-100 text-rose-900 ring-rose-300",
};

export const levelIcon: Record<Level, string> = {
  debug: "🧪",
  info: "📘",
  warn: "⚠️",
  error: "⛔",
};

export function groupByDate(logs: LogEntry[]) {
  const map = new Map<string, LogEntry[]>();
  for (const l of logs) {
    const day = new Date(l.timestamp).toLocaleDateString("ru-RU");
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(l);
  }
  return Array.from(map.entries());
}

export function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
