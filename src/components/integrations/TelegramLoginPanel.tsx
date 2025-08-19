// Server Component — БЕЗ "use client"
import TelegramLoginButtonClient from "./TelegramLoginButton.client";

export default function TelegramLoginPanel() {
  // Можно читать публичную переменную прямо тут:
  const botUsername = process.env.NEXT_PUBLIC_TG_BOT_USERNAME!;
  return (
    <div className="rounded-2xl border p-4">
      <h3 className="font-semibold mb-2">Привязка Telegram</h3>
      <TelegramLoginButtonClient
        botUsername={botUsername}
        // все пропсы — только сериализуемые данные, БЕЗ функций:
        size="large"
        cornerRadius={12}
        requestAccessWrite={true}
        refreshAfterLink={true}
      />
    </div>
  );
}
