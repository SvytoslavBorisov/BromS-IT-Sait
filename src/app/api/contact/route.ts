// src/app/api/contact/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

/** ===== helpers ===== */
function sanitize(v?: string) {
  return (v ?? "").trim().replace(/^["']|["']$/g, "");
}
function isTruthy(v?: string) {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function toPlain(htmlish: string) {
  return htmlish.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function buildTransport({ port, secure }: { port: number; secure: boolean }) {
  const user = sanitize(process.env.MAILRU_USER);
  const pass = sanitize(process.env.MAILRU_PASS);
  if (!user || !pass) throw new Error("MAILRU_USER/MAILRU_PASS не заданы");

  return nodemailer.createTransport({
    host: "smtp.mail.ru",
    port,
    secure,                    // 465=true, 587=false
    requireTLS: !secure,       // для 587 — STARTTLS
    name: "broms-it.ru",       // EHLO name
    family: 4,                 // принудительно IPv4 (лечит ECONNRESET/REFUSED)
    auth: { user, pass },
    authMethod: "LOGIN",
    tls: { servername: "smtp.mail.ru" }, // SNI
    // подробные логи можно включить точечно
    logger: false,
    debug: false,
  });
}

/** ===== core send with 465↔587 fallback ===== */
async function sendWithFallback(opts: {
  fromDisplayName: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const user = sanitize(process.env.MAILRU_USER);
  if (!user) throw new Error("MAILRU_USER не задан");

  // какие порты пробуем (сначала из ENV, затем фолбэк)
  const requestedPort = Number(process.env.MAILRU_PORT || 465);
  const attempts: Array<{ port: number; secure: boolean; label: string }> = [];
  attempts.push({ port: requestedPort, secure: requestedPort === 465, label: `primary:${requestedPort}` });
  if (requestedPort === 465) attempts.push({ port: 587, secure: false, label: "fallback:587" });
  else attempts.push({ port: 465, secure: true, label: "fallback:465" });

  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@broms-it.ru>`;
  let lastErr: any = null;

  for (const a of attempts) {
    try {
      const transporter = buildTransport({ port: a.port, secure: a.secure });

      // заранее проверим коннект/логин
      await transporter.verify();

      await transporter.sendMail({
        from: `"${opts.fromDisplayName.replace(/"/g, "'")}" <${user}>`, // важно: адрес = MAILRU_USER
        to: opts.to,
        replyTo: opts.replyTo, // только если email указан
        subject: opts.subject,
        html: opts.html,
        text: opts.text ?? toPlain(opts.html),
        envelope: { from: user, to: opts.to }, // Return-Path
        messageId,
        headers: {
          "X-Mailer": "BromsIT",
        },
      });

      return; // успех
    } catch (e: any) {
      lastErr = e;

      const msg = String(e?.message || "").toLowerCase();
      const code = e?.code || e?.responseCode;
      const isNetErr =
        code === "ESOCKET" ||
        code === "ETIMEDOUT" ||
        code === "ECONNRESET" ||
        code === "ECONNREFUSED" ||
        msg.includes("timeout") ||
        msg.includes("socket") ||
        msg.includes("reset") ||
        msg.includes("refused");

      if (!isNetErr) throw e; // не сеть — нет смысла пробовать другой порт
      // иначе пробуем следующую попытку
    }
  }

  throw lastErr;
}

/** ===== handler ===== */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = sanitize(body?.name);
    const email = sanitize(body?.email);
    const phone = sanitize(body?.phone);
    const message = String(body?.message ?? "").trim();

    // валидация как на клиенте: имя >=2, есть email ИЛИ телефон, сообщение >=10
    if (name.length < 2) {
      return NextResponse.json({ ok: false, error: "Укажите имя (не короче 2 символов)" }, { status: 400 });
    }
    if (!email && !phone) {
      return NextResponse.json({ ok: false, error: "Укажите e-mail или телефон для связи" }, { status: 400 });
    }
    if (message.length < 10) {
      return NextResponse.json({ ok: false, error: "Сообщение должно быть не короче 10 символов" }, { status: 400 });
    }

    const to = sanitize(process.env.CONTACT_TO) || sanitize(process.env.MAILRU_USER) || "sv_borisov03@mail.ru";

    // собираем письмо
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeMsg = escapeHtml(message).replace(/\n/g, "<br>");

    const subject = `Новое сообщение с формы обратной связи — ${safeName}`;
    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;max-width:640px;line-height:1.5">
        <h2 style="margin:0 0 12px">Новое сообщение с сайта</h2>
        <p><b>Имя:</b> ${safeName}</p>
        ${email ? `<p><b>Email:</b> ${safeEmail}</p>` : ""}
        ${phone ? `<p><b>Телефон:</b> ${safePhone}</p>` : ""}
        <p><b>Сообщение:</b><br>${safeMsg}</p>
      </div>
    `.trim();

    await sendWithFallback({
      fromDisplayName: name,         // в From отобразится имя, адресом будет MAILRU_USER
      to,
      replyTo: email || undefined,   // чтобы из клиента можно было «Ответить»
      subject,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // типовые понятные ответы
    if (err?.responseCode === 535 || err?.code === "EAUTH") {
      return NextResponse.json(
        { ok: false, error: "Mail.ru отклонил SMTP-логин (535). Проверь MAILRU_USER и пароль приложения SMTP, а также что From совпадает с MAILRU_USER." },
        { status: 502 }
      );
    }
    if (err?.code === "ETIMEDOUT" || String(err?.message || "").toLowerCase().includes("timeout")) {
      return NextResponse.json(
        { ok: false, error: "SMTP timeout. Сервер Mail.ru не ответил вовремя." },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: false, error: "SMTP ошибка отправки" }, { status: 502 });
  }
}
