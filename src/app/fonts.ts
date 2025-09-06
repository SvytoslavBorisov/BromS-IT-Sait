import localFont from "next/font/local";

export const poppins = localFont({
  src: [
    { path: "public/fonts/Poppins-400.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export const geistSans = localFont({
  src: "public/fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

export const geistMono = localFont({
  src: "public/fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});
