export function binom(n: number, k: number) {
  if (n < 0 || k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

export function toLocalInputValue(d: Date) {
  const pad = (x: number) => String(x).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function secretStrength(s: string) {
  if (!s) return { score: 0, label: "пусто" };
  let variety = 0;
  if (/[a-z]/.test(s)) variety++;
  if (/[A-Z]/.test(s)) variety++;
  if (/[0-9]/.test(s)) variety++;
  if (/[^a-zA-Z0-9]/.test(s)) variety++;
  const lengthScore = Math.min(60, s.length * 3);
  const varietyScore = variety * 10;
  const score = Math.min(100, lengthScore + varietyScore);
  const label = score >= 80 ? "сильный" : score >= 50 ? "средний" : "слабый";
  return { score, label };
}
