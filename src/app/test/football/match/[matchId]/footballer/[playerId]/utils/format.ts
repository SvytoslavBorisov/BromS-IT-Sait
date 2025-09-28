export function pct(num: number, den: number): string {
  if (!den) return "—";
  return `${Math.round((num / den) * 100)}%`;
}

export function fxg(x?: number | null): string {
  const v = x ?? 0;
  return (Math.round(v * 1000) / 1000).toString();
}

export function mmss(minute?: number, second?: number): string {
  const m = Math.max(0, minute ?? 0);
  const s = Math.max(0, second ?? 0);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${mm}:${ss}`;
}
