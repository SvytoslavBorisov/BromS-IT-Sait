// src/app/fonts.ts  (файл лежит в src/app/)
import localFont from "next/font/local";

export const poppins = localFont({
  src: [
    { path: "../../public/fonts/Poppins-400.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const geistSans = localFont({
  src: "../../public/fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

export const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

import { Onest, Manrope, JetBrains_Mono } from "next/font/google";

export const onest = Onest({
  subsets: ["cyrillic", "latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-onest",
});

export const manrope = Manrope({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-manrope",
});

export const jbmono = JetBrains_Mono({
  subsets: ["cyrillic", "latin"],
  weight: ["500"],
  display: "swap",
  variable: "--font-jbmono",
});