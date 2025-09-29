// src/lib/captcha/ensureHuman.ts
import { solvePow } from "./pow-client";

const inflightByAction = new Map<string, Promise<void>>();

export async function ensureHuman(
  action: "login" | "register" | "resend" | "forgot" | "reset"
): Promise<void> {
  const existing = inflightByAction.get(action);
  if (existing) return existing;

  const p = (async () => {
    // 1) Берём подписанный state + требуемую сложность у сервера
    const res = await fetch(
      `/api/captcha/state?act=${encodeURIComponent(action)}`,
      { cache: "no-store", credentials: "include" }
    );
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) throw new Error("captcha_state_failed");

    // FAST-PATH: сервер сказал, что уже есть валидный HPT
    if (data?.skip) return;

    if (!data?.state) throw new Error("captcha_state_missing");

    const requiredDifficulty: number = Number(data.requiredDifficulty ?? 20);

    // Подбор параметров под устройство
    const isMobile = /Android|iPhone|Mobile/i.test(navigator.userAgent);
    const yieldEvery = isMobile ? 2048 : 8192;
    const timeoutMs = isMobile ? 10_000 : 12_000;

    // 2) Решаем PoW на клиенте строго на серверной сложности
    const pow = await solvePow({
      stateB64: data.state,
      action,
      difficulty: requiredDifficulty,
      timeoutMs,
      yieldEvery,
    });

    // 3) Серверная верификация и выпуск HPT (HttpOnly cookie)
    const v = await fetch("/api/captcha/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "include",
      body: JSON.stringify({ action, state: data.state, pow }),
    });

    const vj = await v.json().catch(() => ({}));
    if (!v.ok || !vj?.ok) {
      const reason = vj?.message || "captcha_verify_failed";
      const details =
        vj?.need != null ? ` (need: ${vj.need}, got: ${vj.zeros ?? "?"})` : "";
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
