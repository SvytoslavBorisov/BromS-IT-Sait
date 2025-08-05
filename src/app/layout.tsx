"use client"; 

import "../styles/index.css";
import { Providers } from "./providers";  // импортируем
import type { ReactNode } from "react";
import { Poppins } from "next/font/google";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";


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