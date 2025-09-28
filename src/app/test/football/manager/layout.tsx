import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Next Football",
  description: "Футбольный симулятор на Next.js",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <div className="container py-6">
        <header className="border-b">
          <div className="container py-4 flex items-center justify-between">
            <a href="/test/football/manager/" className="h1">Next Football</a>
            <nav className="flex gap-5">
              <a href="/test/football/manager/players" className="text-sm">Игроки</a>
              <a href="/test/football/manager/teams" className="text-sm">Команды</a>
              <a href="/test/football/manager/match/simulate" className="text-sm">Симуляция</a>
            </nav>
          </div>
        </header>
        
        {children}
    </div>
  );
}
