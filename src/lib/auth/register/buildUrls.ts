// src/lib/auth/register/buildUrls.ts

/** Хелпер: строим SPA-URL для шага "проверьте почту" */
export function buildCheckEmailUrl(origin: string, email: string) {
  const u = new URL("/auth", origin);
  u.searchParams.set("tab", "register");
  u.searchParams.set("stage", "check-email");
  u.searchParams.set("email", email);
  return u.toString();
}

/** Хелпер: строим SPA-URL для логина */
export function buildLoginUrl(origin: string, notice?: string) {
  const u = new URL("/auth", origin);
  u.searchParams.set("tab", "login");
  if (notice) u.searchParams.set("notice", notice);
  return u.toString();
}
