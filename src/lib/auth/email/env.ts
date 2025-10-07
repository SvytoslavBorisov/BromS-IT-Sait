// src/lib/auth/email_mail/env.ts
import { ensureDisplayFrom, extractAddress, isTruthy } from "./utils";

export type MailruEnv = {
  host: "smtp.mail.ru";
  user: string;            // name@mail.ru
  pass: string;
  requestedPort: number;   // 465 или 587 (ENV задаёт предпочтение)
  from: string;            // "Name <addr>"
  envelopeFrom: string;    // чистый адрес (Return-Path)
  pool: boolean;
  appBase: string;         // без завершающего слеша
};

export function readMailruEnv(): MailruEnv {
  const user = (process.env.MAILRU_USER || "").trim();
  const pass = (process.env.MAILRU_PASS || "").trim();
  const portEnv = Number(process.env.MAILRU_PORT || 465);
  const fromRaw = (process.env.MAILRU_FROM || user).trim();
  const pool = isTruthy(process.env.MAILRU_POOL);
  const appBase = (process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");

  if (!user) throw new Error("MAILRU_USER is not set");
  if (!pass) throw new Error("MAILRU_PASS is not set");
  if (!Number.isFinite(portEnv) || portEnv <= 0) throw new Error("MAILRU_PORT is not a valid number");

  const from = ensureDisplayFrom(fromRaw);
  const envelopeFrom = extractAddress(fromRaw);

  return {
    host: "smtp.mail.ru",
    user,
    pass,
    requestedPort: portEnv,
    from,
    envelopeFrom,
    pool,
    appBase,
  };
}
