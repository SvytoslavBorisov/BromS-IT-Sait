// src/lib/auth/utils.ts
export function extractIpUa(req: unknown): { ip: string; ua: string } {
  const get = (name: string): string | undefined => {
    // Fetch API Request
    const fromFetch = (req as any)?.headers?.get?.(name);
    if (fromFetch) return fromFetch;
    // Node/Next headers
    const headers = (req as any)?.headers;
    if (headers && typeof headers === "object") {
      const v = headers[name] || headers[name.toLowerCase()];
      if (typeof v === "string") return v;
      if (Array.isArray(v)) return v[0];
    }
    return undefined;
  };

  const forwarded = get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    (req as any)?.socket?.remoteAddress ||
    "unknown";

  const ua = get("user-agent") || "unknown";

  return { ip, ua };
}
