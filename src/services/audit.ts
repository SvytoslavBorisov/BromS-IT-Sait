// services/audit.ts
export async function audit(event: string, data: Record<string, any> = {}) {
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...data }),
    });
  } catch {
    // не мешаем UI
  }
}
