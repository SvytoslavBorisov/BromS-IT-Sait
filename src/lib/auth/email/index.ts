// src/lib/auth/email_mail/index.ts
import { sendMailSafe } from "./send-safe";
import { verificationTemplate, passwordResetTemplate } from "./templates/templates";
import { logger, ensureRequestId } from "@/lib/logger";

const baseLog = logger.child({ module: "EmailMail" });

/** ===== Письмо подтверждения e-mail (Mail.ru) ===== */
export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const requestId = ensureRequestId();
  const log = baseLog.child({ requestId });

  try {
    const { subject, text, html } = verificationTemplate(verifyUrl);
    log.info({ message: "Compose verification email", to, verifyUrl });
    await sendMailSafe({ to, subject, html, text });
  } catch (e: any) {
    log.error({ message: "sendVerificationEmail failed", to, verifyUrl, code: e?.code || e?.responseCode });
    if (e?.responseCode === 535 || e?.code === "EAUTH") {
      throw new Error("MAIL.RU SMTP auth failed (wrong user or password)");
    }
    if (e?.code === "ETIMEDOUT" || String(e?.message || "").toLowerCase().includes("timeout")) {
      throw new Error("MAIL.RU SMTP timeout while sending verification email");
    }
    throw e;
  }
}

/** ===== Письмо для сброса пароля (Mail.ru) ===== */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const requestId = ensureRequestId();
  const log = baseLog.child({ requestId });

  try {
    const { subject, text, html } = passwordResetTemplate(resetUrl);
    log.info({ message: "Compose password reset email", to, resetUrl });
    await sendMailSafe({ to, subject, html, text });
  } catch (e: any) {
    log.error({ message: "sendPasswordResetEmail failed", to, resetUrl, code: e?.code || e?.responseCode });
    if (e?.responseCode === 535 || e?.code === "EAUTH") {
      throw new Error("MAIL.RU SMTP auth failed (wrong user or password)");
    }
    if (e?.code === "ETIMEDOUT" || String(e?.message || "").toLowerCase().includes("timeout")) {
      throw new Error("MAIL.RU SMTP timeout while sending password reset email");
    }
    throw e;
  }
}
