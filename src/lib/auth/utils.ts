// src/lib/auth/utils.ts
export function extractIpUa(req: any): { ip?: string; ua: string } {
  // Унифицируем чтение заголовков из разных объектов (Request, NextRequest, NextAuth Request-like)
  const get = (name: string): string | null => {
    try {
      if (req?.headers?.get) return req.headers.get(name);
      if (typeof req?.headers === "object" && req.headers) {
        const v = (req.headers[name] ?? req.headers[name.toLowerCase()]) as string | undefined;
        return v ?? null;
      }
    } catch {}
    return null;
  };

  const ua = get("user-agent") || "";
  // XFF может быть списком, берём первый
  const xff = (get("x-forwarded-for") || "").split(",")[0].trim();
  const xrip = (get("x-real-ip") || "").trim();
  // Некоторые рантаймы кладут IP в req.ip
  const rawIp = xff || xrip || (req?.ip ?? "");
  // В деве часто "::1" — это ок; не обнуляем его
  const ip = rawIp || undefined;

  return { ip, ua };
}
