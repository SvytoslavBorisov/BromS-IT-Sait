// src/lib/captcha/ensureHuman.ts
import { solvePow } from "./pow-client";

const inflightByAction = new Map<string, Promise<void>>();

export async function ensureHuman(action: "login" | "register" | "resend" | "forgot" | "reset"): Promise<void> {
  const existing = inflightByAction.get(action);
  if (existing) return existing;

  const p = (async () => {
    const res = await fetch(`/api/captcha/state?act=${encodeURIComponent(action)}`, {
      cache: "no-store",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) throw new Error("captcha_state_failed");
    if (data?.skip) return;
    if (!data?.state || !data?.stateBody) throw new Error("captcha_state_missing");

    const isMobile = /Android|iPhone|Mobile/i.test(navigator.userAgent);
    const pow = await solvePow({
      stateB64: String(data.stateBody),
      action,
      difficulty: Number(data.requiredDifficulty ?? 18),
      timeoutMs: isMobile ? 12000 : 20000,
      yieldEvery: isMobile ? 2048 : 8192,
    });

    const v = await fetch("/api/captcha/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "include",
      body: JSON.stringify({ action, state: data.state, pow }),
    });

    const vj = await v.json().catch(() => ({}));
    if (!v.ok || !vj?.ok) {
      const details = vj?.need != null ? ` (need: ${vj.need}, got: ${vj.zeros ?? "?"})` : "";
      throw new Error(`${vj?.message || "captcha_verify_failed"}${details}`);
    }
  })();

  inflightByAction.set(action, p);
  try { await p; } finally { inflightByAction.delete(action); }
}
