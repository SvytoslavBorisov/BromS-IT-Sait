// src/lib/auth/email.ts
import { createTransport, Transporter } from "nodemailer";

/** Небольшие утилиты */
function hasAngleAddress(v: string) {
  return /<[^>]+>/.test(v);
}
function extractAddress(v: string) {
  const m = v.match(/<([^>]+)>/);
  return m ? m[1] : v.trim();
}
function ensureDisplayFrom(rawFrom: string): string {
  // Если FROM — просто адрес, добавим имя отправителя
  if (!hasAngleAddress(rawFrom)) {
    return `Broms IT <${rawFrom}>`;
  }
  return rawFrom.trim();
}
function isTruthy(v?: string) {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/** Чтение и валидация SMTP-переменных окружения */
function readSmtpEnv() {
  const host = (process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").trim();
  const fromRaw = (process.env.SMTP_FROM || user || "no-reply@example.com").trim();
  const authMethod = (process.env.SMTP_AUTH_METHOD || "").trim() as
    | "LOGIN"
    | "PLAIN"
    | "";
  const pool = isTruthy(process.env.SMTP_POOL);
  const appBase = (process.env.APP_BASE_URL || "").trim().replace(/\/+$/, ""); // без завершающего /

  if (!host) throw new Error("SMTP_HOST is not set");
  if (!user) throw new Error("SMTP_USER is not set");
  if (!pass) throw new Error("SMTP_PASS is not set");
  if (pass === "/* secret */" || /[*●]+/.test(pass) || pass.toLowerCase().includes("secret")) {
    throw new Error("SMTP_PASS looks masked; pass the real secret value");
  }
  if (!Number.isFinite(port) || port <= 0) throw new Error("SMTP_PORT is not a valid number");

  // В заголовке From лучше иметь 'Name <addr>', а конверт возьмём чистый адрес
  const from = ensureDisplayFrom(fromRaw);
  const envelopeFrom = extractAddress(fromRaw);

  return {
    host,
    port,
    user,
    pass,
    from,          // заголовок From
    envelopeFrom,  // Return-Path
    authMethod: authMethod || undefined,
    pool,
    appBase,       // для List-Unsubscribe (URL)
  };
}

/** Создаём Transporter в рантайме (465 — TLS; 587 — STARTTLS) */
function createMailer(): Transporter {
  const { host, port, user, pass, authMethod, pool } = readSmtpEnv();
  const useTls465 = port === 465;

  return createTransport({
    host,
    port,
    secure: useTls465,         // 465 — true
    requireTLS: !useTls465,    // 587 — STARTTLS
    name: "broms-it.ru",       // EHLO name → помогает с HELO/EHLO у некоторых фильтров
    auth: { user, pass, ...(authMethod ? { method: authMethod } : {}) },
    tls: {
      servername: host,        // SNI
      // rejectUnauthorized: true — по умолчанию true; не ослабляем безопасность
    },
    ...(pool ? { pool: true, maxConnections: 3, maxMessages: 50 } : undefined),
    connectionTimeout: 45_000,
    socketTimeout: 45_000,
    // logger/debug можно выключить в проде:
    logger: false,
    debug: false,
  });
}

/** Общая отправка письма: verify() → sendMail() с корректным Envelope-From и заголовками */
async function sendMailSafe(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromOverride?: string; // если нужно переопределить видимый From
}): Promise<void> {
  const mailer = createMailer();
  const { from, envelopeFrom, appBase } = readSmtpEnv();

  // Проверим доступность SMTP и валидность кредов
  await mailer.verify();

  // Заголовки для антиспам-фильтров (List-Unsubscribe: mailto + opc URL)
  const unsubscribeMailto = `<mailto:${envelopeFrom}>`;
  const unsubscribeUrl = appBase ? `<${appBase}/unsubscribe>` : undefined;

  const headers: Record<string, string> = {
    "X-Mailer": "BromsIT",
    "List-Unsubscribe": unsubscribeUrl ? `${unsubscribeMailto}, ${unsubscribeUrl}` : unsubscribeMailto,
  };
  if (unsubscribeUrl) {
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  // Стабильный Message-ID на домене
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@broms-it.ru>`;

  await mailer.sendMail({
    from: opts.fromOverride || from,        // видимый From (может быть "Name <addr>")
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text || opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    envelope: { from: envelopeFrom, to: opts.to }, // Return-Path
    messageId,
    headers,
  });
}

/** ===== Письмо подтверждения e-mail ===== */
export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
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
  `.trim();

  try {
    await sendMailSafe({ to, subject, html, text });
  } catch (e: any) {
    // Типичные кейсы: EAUTH (креды), ETIMEDOUT (сеть), EENVELOPE/ESOCKET
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
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
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
  `.trim();

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
