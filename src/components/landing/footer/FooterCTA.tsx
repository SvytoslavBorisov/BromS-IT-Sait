// components/footer/FooterCTA.tsx
"use client";

import React from "react";

export default function FooterCTA() {
  return (
    <div className="px-6 py-6 md:px-12 md:py-10 border-b border-white/10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h3 className="text-white text-2xl md:text-3xl font-semibold tracking-tight">
            Делаем чистые интерфейсы и понятные решения
          </h3>
          <p className="mt-1 text-sm md:text-base text-neutral-400">
            Быстро, прозрачно и технологично — от идеи до поддержки.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="https://t.me/yourhandle"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold
                       text-[#0a0a0a] bg-white hover:bg-white/90 ring-1 ring-white/80 transition"
          >
            Написать в Telegram
          </a>
          <a
            href="mailto:bromsit@mail.ru"
            className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold
                       text-white bg-transparent ring-1 ring-white/30 hover:ring-white/60 transition"
          >
            E-mail
          </a>
        </div>
      </div>
    </div>
  );
}
