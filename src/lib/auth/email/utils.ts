// src/lib/auth/email_mail/utils.ts

export function hasAngleAddress(v: string) {
  return /<[^>]+>/.test(v);
}

export function extractAddress(v: string) {
  const m = v.match(/<([^>]+)>/);
  return m ? m[1] : v.trim();
}

export function ensureDisplayFrom(rawFrom: string): string {
  return hasAngleAddress(rawFrom) ? rawFrom.trim() : `Broms IT <${rawFrom}>`;
}

export function isTruthy(v?: string) {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

export function htmlToPlain(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
