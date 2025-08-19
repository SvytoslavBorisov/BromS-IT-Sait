// src/app/api/contact/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

function sanitize(v?: string) {
  return (v ?? "").trim().replace(/^["']|["']$/g, ""); // срежем случайные кавычки
}

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: "Заполните все поля" }, { status: 400 });
    }

    const user = sanitize(process.env.MAILRU_USER);
    const pass = sanitize(process.env.MAILRU_PASS);

    if (!user || !pass) {
      return NextResponse.json({ ok: false, error: "MAILRU_USER/MAILRU_PASS не заданы" }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.mail.ru",
      port: 465,
      secure: true,
      auth: { user, pass },
      authMethod: "LOGIN",                 // принудительно LOGIN
      tls: { servername: "smtp.mail.ru" }, // на всякий случай SNI
      logger: true, // можно включить для подробных логов
    });

    // Диагностика — проверим логин заранее
    try {
      await transporter.verify();
      // eslint-disable-next-line no-console
      console.log(`[mailru] verify OK user=${user}`);
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[mailru] verify failed:", e?.response || e?.message);
      if (e?.responseCode === 535) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Mail.ru отклонил SMTP‑логин (535). Нужен пароль приложения для SMTP, From=MAILRU_USER.",
          },
          { status: 502 }
        );
      }
      return NextResponse.json({ ok: false, error: "SMTP verify error" }, { status: 502 });
    }

    await transporter.sendMail({
      from: `"${name.replace(/"/g, "'")}" <${user}>`, // адрес = MAILRU_USER (обязательно)
      to: "sv_borisov03@mail.ru",                            // получатель уведомлений
      replyTo: email,                                 // чтобы отвечать отправителю
      subject: "Новое сообщение с формы обратной связи",
      text: `Имя: ${name}\nEmail: ${email}\n\n${message}`,
      html: `<p><b>Имя:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Сообщение:</b><br>${message.replace(/\n/g,"<br>")}</p>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[mailru] send error:", err?.response || err?.message);
    if (err?.responseCode === 535) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Mail.ru отклонил SMTP‑логин (535). Проверь MAILRU_USER, пароль приложения SMTP и что From совпадает.",
        },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: false, error: "SMTP ошибка" }, { status: 502 });
  }
}
