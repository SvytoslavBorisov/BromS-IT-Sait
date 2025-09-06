import localFont from "next/font/local";

export const poppins = localFont({
  src: [
    { path: "/fonts/Poppins-400.woff2", weight: "400", style: "normal" },
    { path: "/fonts/Poppins-600.woff2", weight: "600", style: "normal" },
    { path: "/fonts/Poppins-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const geistSans = localFont({
  src: "/fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

export const geistMono = localFont({
  src: "/fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});
