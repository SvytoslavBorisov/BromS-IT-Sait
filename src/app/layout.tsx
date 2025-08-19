"use client"; 

import "@/styles/globals.css";
import "@/styles/projects.css";
import { Providers } from "./providers";  // импортируем
import type { ReactNode } from "react";
import { Poppins } from "next/font/google";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script'


const poppins = Poppins({
  weight: ["400","600","700"],
  subsets: ["latin-ext"],   
  variable: "--font-poppins",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
 {/* Яндекс.Метрика */}
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
              })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=103618442','ym');

              ym(103618442, 'init', {
                ssr:true,
                webvisor:true,
                clickmap:true,
                ecommerce:"dataLayer",
                accurateTrackBounce:true,
                trackLinks:true
              });
            `,
          }}
        />
        <link rel="icon" type="image/jpg" sizes="32x32" href="/favicon.jpg" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Оборачиваем детей в клиентский провайдер */}
        <Providers>
          <div className={poppins.variable + " font-sans"}>
            <main>
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}