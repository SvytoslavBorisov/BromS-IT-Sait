import "@/app/tailwind.css";
import "katex/dist/katex.min.css";
import "@/styles/latex.css";
import { Providers } from "./providers";
import type { ReactNode } from "react";
import { poppins, geistSans, geistMono } from "./fonts";
import { onest, jbmono, manrope } from "./fonts";
import { YaMetrika } from "./_analytics/YaMetrika";
import Script from "next/script";
import ClientBoot from "./_client-boot";     // ⬅️ новый клиентский компонент
import "./_build-guard";

export const dynamic = "force-dynamic";
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
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta name="application-name" content={SITE_NAME} />
        <meta name="generator" content="Next.js" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b0b0f" />

        <link rel="canonical" href={SITE_URL} />
        <link rel="alternate" hrefLang="ru" href={SITE_URL} />

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

        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0b0b0f" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://mc.yandex.ru" crossOrigin="" />
        <link rel="dns-prefetch" href="https://mc.yandex.ru" />

        {/* structured data (оставляю как у тебя) */}
        <Script
          id="ld-org"
          type="application/ld+json"
          strategy="afterInteractive"
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
        <Script
          id="ld-website"
          type="application/ld+json"
          strategy="afterInteractive"
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
      </head>

      <body
        className={[
          onest.variable,
          manrope.variable,
          jbmono.variable,
          "font-sans antialiased min-h-screen bg-background text-foreground",
          "selection:bg-primary/20 selection:text-primary-foreground",
          "supports-[backdrop-filter]:backdrop-blur-[0.5px]",
        ].join(" ")}
      >
        {/* Метрика и клиентские провайдеры */}
        <YaMetrika id={YANDEX_METRIKA_ID} />
        <Providers>
          <ClientBoot /> {/* ⬅️ все эффекты тут, layout остаётся серверным */}
          <div className="font-sans">
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
