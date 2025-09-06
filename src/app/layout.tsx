import "@/app/tailwind.css";
import "katex/dist/katex.min.css";
import "@/styles/latex.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" dir="ltr">
      <body
        className={[
          "antialiased min-h-screen bg-background text-foreground",
        ].join(" ")}
      >
        <main>{children}</main>
      </body>
    </html>
  );
}