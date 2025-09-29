import { render } from "@react-email/render"; // если используешь
import { createTransport } from "nodemailer";

const transporter = createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});
export async function sendVerificationEmail(to: string, url: string) {
  const from = process.env.SMTP_FROM || "no-reply@example.com";
  const subject = "Подтверждение e-mail";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif">
      <h2>Подтвердите e-mail</h2>
      <p>Для завершения регистрации нажмите кнопку ниже (ссылка действует 24 часа):</p>
      <p>
        <a href="${url}" 
           style="display:inline-block;padding:12px 18px;border-radius:8px;
                  background:#0ea5e9;color:#fff;text-decoration:none;">
          Подтвердить e-mail
        </a>
      </p>
      <p>Если кнопка не работает, скопируйте ссылку в браузер:</p>
      <p><a href="${url}">${url}</a></p>
      <hr/>
      <p style="color:#6b7280;font-size:12px">Если вы не регистрировались — проигнорируйте письмо.</p>
    </div>
  `;
  await transporter.sendMail({ from, to, subject, html });
}



export async function sendPasswordResetEmail(to: string, url: string) {
  const subject = "Сброс пароля";
  const html = `
    <div style="font-family:Inter,system-ui,Segoe UI,Roboto,sans-serif;max-width:560px">
      <h2>Сброс пароля</h2>
      <p>Мы получили запрос на сброс пароля. Если это были вы, перейдите по ссылке ниже в течение 1 часа:</p>
      <p><a href="${url}" style="display:inline-block;padding:10px 16px;border-radius:10px;background:#10b981;color:#fff;text-decoration:none">Сбросить пароль</a></p>
      <p>Ссылка (на случай проблем):<br><code>${url}</code></p>
      <p>Если вы не запрашивали сброс — проигнорируйте это письмо.</p>
    </div>
  `;
  await transporter.sendMail({
    from: process.env.SMTP_FROM!,
    to,
    subject,
    html,
  });
}