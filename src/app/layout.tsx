import "@/app/tailwind.css";
import "katex/dist/katex.min.css";
import "@/styles/latex.css";
import { Providers } from "./providers";
import type { ReactNode } from "react";
import { poppins, geistSans, geistMono } from "./fonts";
import { YaMetrika } from "./_analytics/YaMetrika";
import Script from "next/script";
import '../_build-guard';
export const dynamic = "force-dynamic"; // отключаем SSG глобально
export const revalidate = 0;

const SITE_NAME = "Broms IT";
const SITE_TITLE = "Broms IT — безопасные решения и криптография";
const SITE_DESCRIPTION =
  "Broms IT: безопасное хранение секретов, криптография ГОСТ, цифровые подписи и удобные веб-инструменты.";
const YANDEX_METRIKA_ID = process.env.NEXT_PUBLIC_YM_ID ?? "103618442";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${poppins.variable} ${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}