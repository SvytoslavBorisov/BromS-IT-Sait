// src/lib/auth/email.ts
import { createTransport, Transporter } from "nodemailer";

/** Чтение и валидация SMTP-переменных окружения */
function readSmtpEnv() {
  const host = (process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const from =
    (process.env.SMTP_FROM || user || "no-reply@example.com").trim();
  const authMethod = (process.env.SMTP_AUTH_METHOD || "").trim() as
    | "LOGIN"
    | "PLAIN"
    | "";
  const pool = (process.env.SMTP_POOL || "").trim();

  if (!host) throw new Error("SMTP_HOST is not set");
  if (!user) throw new Error("SMTP_USER is not set");
  if (!pass) throw new Error("SMTP_PASS is not set");
  if (
    pass === "/* secret */" ||
    /[*●]+/.test(pass) ||
    pass.toLowerCase().includes("secret")
  ) {
    throw new Error(
      "SMTP_PASS looks like a placeholder; do not pass masked secrets to transporter",
    );
  }
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("SMTP_PORT is not a valid number");
  }

  return {
    host,
    port,
    user,
    pass,
    from,
    authMethod: authMethod || undefined,
    pool: pool === "1" || pool.toLowerCase() === "true",
  };
}

/** Создаём Transporter в рантайме (465 — TLS; 587 — STARTTLS) */
function createMailer(): Transporter {
  const { host, port, user, pass, authMethod, pool } = readSmtpEnv();
  const useTls465 = port === 465;

  return createTransport({
    host,
    port,
    secure: useTls465,
    requireTLS: !useTls465, // для 587
    name: "broms-it.ru", // EHLO name
    auth: { user, pass },
    ...(authMethod ? { authMethod } : {}),
    tls: { servername: host },
    // Пул можно включить env-переменной (опционально)
    ...(pool
      ? { pool: true, maxConnections: 3, maxMessages: 50 }
      : undefined),
    connectionTimeout: 45_000,
    socketTimeout: 45_000,
    logger: true,
    debug: true,
  });
}

/** Универсальная отправка: verify() → sendMail() с Envelope-From и заголовками */
async function sendMailSafe(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromOverride?: string;
}): Promise<void> {
  const mailer = createMailer();
  const { from } = readSmtpEnv();

  // Чёткая проверка доступности SMTP и кредов
  await mailer.verify();

  const envelopeFrom = /<(.+?)>/.test(from)
    ? (from.match(/<(.+?)>/) as RegExpMatchArray)[1]
    : from;

  await mailer.sendMail({
    from: opts.fromOverride || from, // заголовок From
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    // ВАЖНО: конверт письма (Return-Path) = реальный ящик домена
    envelope: { from: envelopeFrom, to: opts.to },
    // Уникальный message-id на вашем домене — лучше для фильтров
    messageId: `<${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}@broms-it.ru>`,
    headers: {
      "X-Mailer": "BromsIT",
      // Невредный служебный заголовок; некоторым фильтрам нравится
      "List-Unsubscribe": `<mailto:${envelopeFrom}>`,
    },
  });
}

/** ===== Письмо подтверждения e-mail ===== */
export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
): Promise<void> {
  const subject = "Подтверждение e-mail в Broms IT";
  const text = `Подтвердите e-mail: ${verifyUrl}
Ссылка активна 24 часа. Если вы не регистрировались — проигнорируйте письмо.`;
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;line-height:1.5">
      <h2 style="margin:0 0 12px">Подтвердите e-mail</h2>
      <p>Для завершения регистрации нажмите кнопку ниже (ссылка действует 24 часа):</p>
      <p>
        <a href="${verifyUrl}"
           style="display:inline-block;padding:12px 18px;border-radius:8px;background:#0ea5e9;color:#fff;text-decoration:none;">
          Подтвердить e-mail
        </a>
      </p>
      <p>Если кнопка не работает, скопируйте ссылку в браузер:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
      <p style="color:#6b7280;font-size:12px">Если вы не регистрировались — просто проигнорируйте это письмо.</p>
    </div>
  `;

  try {
    await sendMailSafe({ to, subject, html, text });
  } catch (e: any) {
    if (e?.responseCode === 535 || e?.code === "EAUTH") {
      throw new Error("SMTP auth failed (wrong user or password)");
    }
    if (e?.code === "ETIMEDOUT" || e?.message?.toLowerCase?.().includes("timeout")) {
      throw new Error("SMTP timeout while sending verification email");
    }
    throw e;
  }
}

/** ===== Письмо для сброса пароля ===== */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const subject = "Сброс пароля в Broms IT";
  const text = `Мы получили запрос на сброс пароля. Перейдите по ссылке (действует 1 час): ${resetUrl}
Если вы не запрашивали сброс — проигнорируйте письмо.`;
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;line-height:1.5">
      <h2 style="margin:0 0 12px">Сброс пароля</h2>
      <p>Мы получили запрос на сброс пароля. Если это были вы, перейдите по ссылке ниже в течение 1 часа:</p>
      <p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:10px 16px;border-radius:10px;background:#10b981;color:#fff;text-decoration:none;">
          Сбросить пароль
        </a>
      </p>
      <p>Ссылка (на случай проблем):<br><a href="${resetUrl}">${resetUrl}</a></p>
      <p style="color:#6b7280;font-size:12px">Если вы не запрашивали сброс — проигнорируйте это письмо.</p>
    </div>
  `;

  try {
    await sendMailSafe({ to, subject, html, text });
  } catch (e: any) {
    if (e?.responseCode === 535 || e?.code === "EAUTH") {
      throw new Error("SMTP auth failed (wrong user or password)");
    }
    if (e?.code === "ETIMEDOUT" || e?.message?.toLowerCase?.().includes("timeout")) {
      throw new Error("SMTP timeout while sending password reset email");
    }
    throw e;
  }
}
