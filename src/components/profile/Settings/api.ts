import { UserSettings } from "./types";

export async function audit(event: string, data: Record<string, any> = {}) {
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...data }),
    });
  } catch {}
}

export async function loadSettings(): Promise<Partial<UserSettings> | null> {
  try {
    const r = await fetch("/api/settings");
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function saveSettings(s: UserSettings) {
  const r = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
  });
  if (!r.ok) throw new Error(String(r.status));
}
