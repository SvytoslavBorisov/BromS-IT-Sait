// components/Footer.tsx
"use client";

import React from "react";
import FooterBackground from "./footer/FooterBackground";
import FooterCTA from "./footer/FooterCTA";
import FooterColumns from "./footer/FooterColumns";
import FooterBottom from "./footer/FooterBottom";

export default function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-[#0a0a0a] text-neutral-300 selection:bg-white/20">
      {/* Плавный переход от белого блока сверху */}
      <FooterBackground />

      {/* Контент */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 pt-10 md:pt-16">
        <div className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-xl shadow-[0_30px_120px_-40px_rgba(0,0,0,.7)] overflow-hidden">
          <FooterCTA />
          <FooterColumns />
          <FooterBottom />
        </div>
      </div>

      {/* Стили: подчёркивание ссылок */}
      <style>{`
        .link {
          color: #fff;
          position: relative;
        }
        .link::after {
          content: "";
          position: absolute;
          left: 0; right: 0; bottom: -2px; height: 1px;
          background: linear-gradient(90deg, transparent, #fff, transparent);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform .35s ease;
          opacity: .9;
        }
        .link:hover::after { transform: scaleX(1); }
      `}</style>
    </footer>
  );
}
