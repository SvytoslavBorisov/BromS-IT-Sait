// components/contact/ContactActions.tsx
"use client";

import React from "react";

export default function ContactActions() {
  return (
    <div className="mt-8 grid grid-cols-2 gap-3 max-w-sm">
      <a
        href="https://t.me/+fnL2WMHosstjY2Qy"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black text-white px-4 py-3 text-sm font-medium shadow-sm hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-black/20"
      >
        Telegram
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M21.5 4.5 3.7 11.6a1 1 0 0 0 0 1.8l4.3 1.5 1.6 4.8a1 1 0 0 0 1.9.2l2.4-4.3 4.6 3.4a1 1 0 0 0 1.9-.8l2.4-12a1 1 0 0 0-1.6-1.2Z" />
        </svg>
      </a>

      <a
        href="mailto:bromsit@mail.ru"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium ring-1 ring-black/10 shadow-sm hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/20"
      >
        Написать на почту
      </a>
    </div>
  );
}
