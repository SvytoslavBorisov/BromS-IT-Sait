export function initials(name?: string | null, surname?: string | null) {
  const a = (name?.[0] ?? "").toUpperCase();
  const b = (surname?.[0] ?? "").toUpperCase();
  return (a + b) || "U";
}

export function formatBytes(b: number) {
  if (!Number.isFinite(b)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (b >= 1024 && i < units.length - 1) {
    b /= 1024;
    i++;
  }
  return `${b.toFixed(1)} ${units[i]}`;
}

export function toPublicHref(p?: string | null) {
  if (!p) return "#";
  const u = p.replace(/\\/g, "/");
  const m = u.match(/(?:^|\/)public\/(.+)$/);
  if (m) return "/" + m[1];
  return u.startsWith("/") ? u : "/" + u;
}
