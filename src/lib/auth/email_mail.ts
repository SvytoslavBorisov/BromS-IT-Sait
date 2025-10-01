// src/lib/auth/email_mail.ts
import { createTransport, Transporter } from "nodemailer";

/** ==== Утилиты ==== */
function hasAngleAddress(v: string) { return /<[^>]+>/.test(v); }
function extractAddress(v: string) { const m = v.match(/<([^>]+)>/); return m ? m[1] : v.trim(); }
function ensureDisplayFrom(rawFrom: string): string { return hasAngleAddress(rawFrom) ? rawFrom.trim() : `Broms IT <${rawFrom}>`; }
function isTruthy(v?: string) {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/** ==== ENV для Mail.ru ==== */
function readMailruEnv() {
  const user = (process.env.MAILRU_USER || "").trim();              // name@mail.ru
  const pass = (process.env.MAILRU_PASS || "").trim();
  const portEnv = Number(process.env.MAILRU_PORT || 465);           // можно оставить 465 — будет фолбэк
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
    user, pass,
    requestedPort: portEnv,
    from, envelopeFrom,
    pool, appBase,
  };
}

/** Создаём Transporter с нужными режимами (TLS 465 / STARTTLS 587), IPv4, EHLO */
function buildTransport({ port, secure }: { port: number; secure: boolean }): Transporter {
  const { host, user, pass, pool } = readMailruEnv();
  return createTransport({
    host,
    port,
    secure,                   // 465=true, 587=false
    requireTLS: !secure,      // для 587
    name: "broms-it.ru",
    family: 4,                // принудительно IPv4 (часто лечит ECONNRESET)
    auth: { user, pass, method: "LOGIN" },
    tls: { servername: host },
    ...(pool ? { pool: true, maxConnections: 3, maxMessages: 50 } : undefined),
    connectionTimeout: 45_000,
    socketTimeout: 45_000,
    logger: false,
    debug: false,
  });
}

/** Базовая отправка с авто-фолбэком порта (465 → 587) */
async function sendMailInternal(opts: {
  to: string; subject: string; html: string; text?: string; fromOverride?: string;
}) {
  const { from, envelopeFrom, appBase, requestedPort } = readMailruEnv();

  const attempts: Array<{ port: number; secure: boolean; label: string }> = [];
  // сначала — как задано через ENV
  attempts.push({ port: requestedPort, secure: requestedPort === 465, label: `primary:${requestedPort}` });
  // затем — альтернативный порт
  if (requestedPort === 465) attempts.push({ port: 587, secure: false, label: "fallback:587" });
  else attempts.push({ port: 465, secure: true, label: "fallback:465" });

  const unsubscribeMailto = `<mailto:${envelopeFrom}>`;
  const unsubscribeUrl = appBase ? `<${appBase}/unsubscribe>` : undefined;
  const headers: Record<string, string> = {
    "X-Mailer": "BromsIT",
    "List-Unsubscribe": unsubscribeUrl ? `${unsubscribeMailto}, ${unsubscribeUrl}` : unsubscribeMailto,
  };
  if (unsubscribeUrl) headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";

  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@broms-it.ru>`;

  let lastErr: any = null;

  for (const a of attempts) {
    try {
      const transport = buildTransport({ port: a.port, secure: a.secure });
      await transport.verify(); // проверяем коннект и логин ДО отправки
      await transport.sendMail({
        from: opts.fromOverride || from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text || opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        envelope: { from: envelopeFrom, to: opts.to },
        messageId,
        headers,
      });
      // успех — выходим
      return;
    } catch (e: any) {
      lastErr = e;
      // сетевые ошибки — пробуем альтернативный порт
      const msg = String(e?.message || "").toLowerCase();
      const code = e?.code || e?.responseCode;
      const isNetErr =
        code === "ESOCKET" ||
        code === "ETIMEDOUT" ||
        code === "ECONNRESET" ||
        msg.includes("timeout") ||
        msg.includes("socket") ||
        msg.includes("reset");

      if (!isNetErr) throw e; // не сеть — сразу пробрасываем
      // иначе цикл попробует следующий порт
    }
  }

  // если все попытки не удались — кидаем последнюю ошибку
  throw lastErr;
}

/** Публичные функции */
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
           style="display:inline-block;padding:12px 18px;border-radius:8px;background:#0ea5e9;text-decoration:none;color:#fff;">
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
    await sendMailInternal({ to, subject, html, text });
  } catch (e: any) {
    if (e?.responseCode === 535 || e?.code === "EAUTH") {
      throw new Error("MAIL.RU SMTP auth failed (wrong user or password)");
    }
    if (e?.code === "ETIMEDOUT" || String(e?.message || "").toLowerCase().includes("timeout")) {
      throw new Error("MAIL.RU SMTP timeout while sending verification email");
    }
    throw e;
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const subject = "Сброс пароля в Broms IT";
  const text = `Мы получили запрос на сброс пароля. Перейдите по ссылке (действует 1 час): ${resetUrl}
Если вы не запрашивали сброс — проигнорируйте письмо.`;
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;line-height:1.5">
      <h2 style="margin:0 0 12px">Сброс пароля</h2>
      <p>Если это были вы, перейдите по ссылке ниже в течение 1 часа:</p>
      <p>
        <a href="${resetUrl}"
           style="display:inline-block;padding:10px 16px;border-radius:10px;background:#10b981;text-decoration:none;color:#fff;">
          Сбросить пароль
        </a>
      </p>
      <p>Ссылка (на случай проблем): <a href="${resetUrl}">${resetUrl}</a></p>
      <p style="color:#6b7280;font-size:12px">Если вы не запрашивали сброс — проигнорируйте это письмо.</p>
    </div>
  `.trim();

  try {
    await sendMailInternal({ to, subject, html, text });
  } catch (e: any) {
    if (e?.responseCode === 535 || e?.code === "EAUTH") {
      throw new Error("MAIL.RU SMTP auth failed (wrong user or password)");
    }
    if (e?.code === "ETIMEDOUT" || String(e?.message || "").toLowerCase().includes("timeout")) {
      throw new Error("MAIL.RU SMTP timeout while sending password reset email");
    }
    throw e;
  }
}
