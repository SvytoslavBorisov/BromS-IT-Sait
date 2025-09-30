// utils/email-timeout.ts (создай)
export async function withTimeout<T>(p: Promise<T>, ms: number, label = "op"): Promise<T | null> {
  return Promise.race([
    p.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]) as Promise<T | null>;
}
