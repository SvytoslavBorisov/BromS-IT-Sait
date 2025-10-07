// src/lib/auth/email_mail/send-safe.ts
import { buildTransport } from "./send";
import { readMailruEnv } from "./env";
import { htmlToPlain } from "./utils";
import { logger, ensureRequestId } from "@/lib/logger";

export async function sendMailSafe(opts: {
  to: string; subject: string; html: string; text?: string; fromOverride?: string;
}) {
  const { from, envelopeFrom, appBase, requestedPort } = readMailruEnv();
  const requestId = ensureRequestId();
  const log = logger.child({ module: "EmailMail/Send", requestId });

  const attempts = [
    { port: requestedPort, secure: requestedPort === 465, label: `primary:${requestedPort}` },
    { port: requestedPort === 465 ? 587 : 465, secure: requestedPort !== 465, label: "fallback" },
  ];

  const unsubscribeMailto = `<mailto:${envelopeFrom}>`;
  const unsubscribeUrl = appBase ? `<${appBase}/unsubscribe>` : undefined;
  const headers: Record<string,string> = {
    "X-Mailer": "BromsIT",
    "List-Unsubscribe": unsubscribeUrl ? `${unsubscribeMailto}, ${unsubscribeUrl}` : unsubscribeMailto,
    ...(unsubscribeUrl ? { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {}),
  };
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@broms-it.ru>`;

  let lastErr: any = null;

  for (const a of attempts) {
    try {
      log.info({ message: "Attempt sending", attempt: a.label, to: opts.to, subject: opts.subject, messageId });
      const transport = buildTransport({ port: a.port, secure: a.secure });

      const tVerify0 = Date.now();
      await transport.verify();
      log.debug({ message: "SMTP verify ok", attempt: a.label, durationMs: Date.now() - tVerify0 });

      const tSend0 = Date.now();
      await transport.sendMail({
        from: opts.fromOverride || from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text ?? htmlToPlain(opts.html),
        envelope: { from: envelopeFrom, to: opts.to },
        messageId,
        headers,
      });

      log.info({ message: "Email sent", attempt: a.label, to: opts.to, subject: opts.subject, durationMs: Date.now() - tSend0 });
      return;
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || "").toLowerCase();
      const code = e?.code || e?.responseCode;
      const isNetErr = ["ESOCKET","ETIMEDOUT","ECONNRESET","ECONNREFUSED"].includes(code) ||
                       msg.includes("timeout") || msg.includes("socket") || msg.includes("reset") || msg.includes("refused");

      log.warn?.({ message: "Attempt failed", attempt: a.label, code, error: e?.message });
      if (!isNetErr) { logger.logError?.(e, { module: "EmailMail/Send", requestId, to: opts.to, subject: opts.subject, attempt: a.label }); throw e; }
      // иначе пробуем следующий порт
    }
  }
  logger.logError?.(lastErr, { module: "EmailMail/Send", requestId, to: opts.to, subject: opts.subject, note: "All attempts failed" });
  throw lastErr;
}
