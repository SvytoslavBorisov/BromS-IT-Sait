export const metadata = { title: "Telegram Mini App", description: "Next.js + Telegraf skeleton" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        {children}
      </body>
    </html>
  );
}
