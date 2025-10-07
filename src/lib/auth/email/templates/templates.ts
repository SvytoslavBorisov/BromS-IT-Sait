// src/lib/auth/email_mail/templates.ts

export function verificationTemplate(verifyUrl: string) {
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

  return { subject, text, html };
}

export function passwordResetTemplate(resetUrl: string) {
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

  return { subject, text, html };
}
