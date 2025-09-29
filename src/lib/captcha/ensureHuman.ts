// src/lib/captcha/ensureHuman.ts
import { solvePow } from "./pow-client";

const inflightByAction = new Map<string, Promise<void>>();

export async function ensureHuman(action: "login" | "register" | "resend" | "forgot" | "reset"): Promise<void> {
  const existing = inflightByAction.get(action);
  if (existing) return existing;

  const p = (async () => {
    // 1) Берём подписанный state + требуемую сложность у сервера
    const res = await fetch(`/api/captcha/state?act=${encodeURIComponent(action)}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.state) throw new Error("captcha_state_failed");

    const requiredDifficulty: number = Number(data.requiredDifficulty ?? 20);

    // 2) Решаем PoW на клиенте строго на серверной сложности
    const pow = await solvePow({
      stateB64: data.state,
      action,
      difficulty: requiredDifficulty,
      timeoutMs: 12_000,   // чуть больше времени, если браузер занят
      yieldEvery: 4096,
    });

    // 3) Серверная верификация и выпуск HPT (HttpOnly cookie)
    const v = await fetch("/api/captcha/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ action, state: data.state, pow }),
    });

    const vj = await v.json().catch(() => ({}));
    if (!v.ok || !vj?.ok) {
      // Пробросим детальнее в dev, чтобы было видно need/zeros
      const reason = vj?.message || "captcha_verify_failed";
      const details = vj?.need != null ? ` (need: ${vj.need}, got: ${vj.zeros ?? "?"})` : "";
      throw new Error(`${reason}${details}`);
    }
  })();

  inflightByAction.set(action, p);
  try {
    await p;
  } finally {
    inflightByAction.delete(action);
  }
}
