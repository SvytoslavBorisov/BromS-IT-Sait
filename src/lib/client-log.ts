export async function clientLog(
  level: "debug" | "info" | "warn" | "error",
  event: string,
  details: Record<string, any> = {}
) {
  try {
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, event, ...details }),
    });
  } catch (e) {
    console.warn("Failed to send log", e);
  }
}