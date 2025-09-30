// components/footer/FooterBottom.tsx
"use client";

import React from "react";

export default function FooterBottom() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="border-t border-white/10 px-6 md:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-xs sm:text-sm text-neutral-400">
        © {currentYear} ООО «БромС Ай Ти». Все права защищены.
      </p>

      <a
        href="#top"
        className="group inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 ring-1 ring-white/15 hover:ring-white/25 hover:bg-white/10 transition"
        onClick={(e) => {
          if (location.hash !== "#top") e.preventDefault();
          document.querySelector("#top")?.scrollIntoView({ behavior: "smooth" });
        }}
      >
        <span className="text-sm">Наверх</span>
        <svg
          className="h-4 w-4 transition group-hover:-translate-y-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </a>
    </div>
  );
}
