// src/lib/captcha/ensureHuman.ts
import { solvePow } from "./pow-client";

const inflightByAction = new Map<string, Promise<void>>();

export async function ensureHuman(
  action: "login" | "register" | "resend" | "forgot" | "reset"
): Promise<void> {
  const existing = inflightByAction.get(action);
  if (existing) return existing;

  const p = (async () => {
    // 1) state + сложность + (возможный) skip
    const res = await fetch(
      `/api/captcha/state?act=${encodeURIComponent(action)}`,
      { cache: "no-store", credentials: "include" }
    );
    const data = await res.json().catch(() => ({} as any));
    if (!res.ok) throw new Error("captcha_state_failed");

    if (data?.skip) return;
    if (!data?.state) throw new Error("captcha_state_missing");

    // Берём для PoW ЧИСТЫЙ base64url: stateBody, а если его нет — первая часть state
    const stateBody: string =
      typeof data.stateBody === "string" && data.stateBody.includes(".") === false
        ? data.stateBody
        : String(data.state).split(".")[0];

    const requiredDifficulty: number = Number(data.requiredDifficulty ?? 18);

    const isMobile = /Android|iPhone|Mobile/i.test(navigator.userAgent);
    const yieldEvery = isMobile ? 2048 : 8192;
    const timeoutMs = isMobile ? 12_000 : 20_000;

    // 2) Решаем PoW по stateBody
    const pow = await solvePow({
      stateB64: stateBody,
      action,
      difficulty: requiredDifficulty,
      timeoutMs,
      yieldEvery,
    });

    // 3) Верификация (шлём ПОЛНЫЙ state)
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
