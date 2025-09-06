import "@/app/tailwind.css";
import "katex/dist/katex.min.css";
import "@/styles/latex.css";
import { Providers } from "./providers";
import type { ReactNode } from "react";
import { poppins, geistSans, geistMono } from "./fonts";
import { YaMetrika } from "./_analytics/YaMetrika";
import Script from "next/script";
import './_build-guard';
export const dynamic = "force-dynamic"; // отключаем SSG глобально
export const revalidate = 0;

const SITE_NAME = "Broms IT";
const SITE_TITLE = "Broms IT — безопасные решения и криптография";
const SITE_DESCRIPTION =
  "Broms IT: безопасное хранение секретов, криптография ГОСТ, цифровые подписи и удобные веб-инструменты.";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://broms-it.ru";
const OG_IMAGE = `${SITE_URL}/og-default.png`;
const YANDEX_METRIKA_ID = process.env.NEXT_PUBLIC_YM_ID ?? "103618442";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" dir="ltr">
      <body>
      </body>
    </html>
  );
}
