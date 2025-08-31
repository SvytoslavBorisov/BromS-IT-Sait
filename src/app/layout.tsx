// src/app/layout.tsx
"use client";

import "@/app/tailwind.css";
import "katex/dist/katex.min.css";
import "@/styles/latex.css";    
import { Providers } from "./providers";
import type { ReactNode } from "react";
import { Poppins } from "next/font/google";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

// === Настройки по умолчанию (подправь под свой домен/бренд) ===
const SITE_NAME = "Broms IT";
const SITE_TITLE = "Broms IT — безопасные решения и криптография";
const SITE_DESCRIPTION =
  "Broms IT: безопасное хранение секретов, криптография ГОСТ, цифровые подписи и удобные веб‑инструменты.";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://broms-it.ru";
const OG_IMAGE = `${SITE_URL}/og-default.png`; // положи картинку 1200x630
const YANDEX_METRIKA_ID = "103618442";         // твой ID (уже был)

// === Шрифты ===
const poppins = Poppins({
  weight: ["400", "600", "700"],
  subsets: ["latin-ext"],
  variable: "--font-poppins",
  display: "swap",
});
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" dir="ltr">
      <head>
        {/* Базовые мета */}
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta name="application-name" content={SITE_NAME} />
        <meta name="generator" content="Next.js" />

        {/* Адаптивный цвет адресной строки под тему */}
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b0b0f" />

        {/* SEO: канонический URL и hreflang (если нужен EN — раскомментируй/дополни) */}
        <link rel="canonical" href={SITE_URL} />
        <link rel="alternate" hrefLang="ru" href={SITE_URL} />
        {/* <link rel="alternate" hrefLang="en" href={`${SITE_URL}/en`} /> */}

        {/* Open Graph / Twitter */}
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:locale" content="ru_RU" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_TITLE} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />

        {/* Иконки и PWA */}
        {/* ВАЖНО: чтобы избежать ошибки Next "conflicting public file", храни favicon ИЛИ в /public/favicon.ico, ИЛИ как app/icon.png.
           Если используешь <link rel="icon"> — оставь /public/favicon.ico и убери app/icon.* */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0b0b0f" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Preconnect для метрик/шрифтов/картинок (микро‑оптимизация) */}
        <link rel="preconnect" href="https://mc.yandex.ru" crossOrigin="" />
        {/* Next/font уже оптимизирует Google Fonts, лишний preconnect к fonts.gstatic.com обычно не нужен */}

        {/* Верификации (плейсхолдеры, если надо) */}
        {/* <meta name="google-site-verification" content="..." /> */}
        {/* <meta name="yandex-verification" content="..." /> */}

        {/* JSON-LD: Organization + WebSite (+ поиск по сайту) */}
        <Script id="ld-org" type="application/ld+json" strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
              logo: `${SITE_URL}/apple-touch-icon.png`,
            }),
          }}
        />
        <Script id="ld-website" type="application/ld+json" strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_URL,
              potentialAction: {
                "@type": "SearchAction",
                target: `${SITE_URL}/search?q={query}`,
                "query-input": "required name=query",
              },
            }),
          }}
        />

        {/* Яндекс.Метрика (без дубликатов при навигации) */}
        <Script
          id="yandex-metrika"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(m,e,t,r,i,k,a){
                m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=1*new Date();
                for (var j = 0; j < document.scripts.length; j++) {
                  if (document.scripts[j].src === r) { return; }
                }
                k=e.createElement(t),a=e.getElementsByTagName(t)[0];
                k.async=1;k.src=r;a.parentNode.insertBefore(k,a)
              })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

              ym(${YANDEX_METRIKA_ID}, 'init', {
                ssr: true,
                defer: true,
                webvisor: true,
                clickmap: true,
                trackLinks: true,
                accurateTrackBounce: true,
                ecommerce: "dataLayer"
              });
            `,
          }}
        />
      </head>

      <body
        className={[
          geistSans.variable,
          geistMono.variable,
          poppins.variable,
          // Немного «глянца» — адаптивные токены, сглаживание, тёплые оттенки фона
          "antialiased min-h-screen bg-background text-foreground",
          "selection:bg-primary/20 selection:text-primary-foreground",
          "supports-[backdrop-filter]:backdrop-blur-[0.5px]",
        ].join(" ")}
      >
        {/* Noscript для Метрики (важно для SEO-ботов/пользователей с отключенным JS) */}
        <noscript>
          <div>
            <img
              src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`}
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>

        {/* Глобальный провайдер (тема/стор/локаль и т.д.) */}
        <Providers>
          <div className="font-sans">
            <main>{children}</main>
          </div>
        </Providers>

        {/* Плагин Рутокен (оставил до интерактива страницы) */}
        <Script src="/rutoken-plugin.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
