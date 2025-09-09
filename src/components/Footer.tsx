// components/Footer.tsx
"use client";

import Link from "next/link";
import React from "react";

const LINKS = [
  { href: "/", label: "Главная" },
  { href: "/about", label: "О нас" },
  { href: "/services", label: "Услуги" },
  { href: "/portfolio", label: "Портфолио" },
  { href: "/contact", label: "Контакты" },
] as const;

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden bg-[#0a0a0a] text-neutral-300 selection:bg-white/20">
      {/* Контент */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 pt-10 md:pt-16">
        <div className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-xl shadow-[0_30px_120px_-40px_rgba(0,0,0,.7)] overflow-hidden">
          {/* Верх: слоган + CTA */}
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

          {/* Секции футера */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 p-8 md:p-12">
            {/* Компания */}
            <div>
              <h4 className="text-white text-lg font-semibold mb-3 tracking-wide">
                БромС&nbsp;Ай&nbsp;Ти
              </h4>
              <p className="leading-relaxed text-neutral-300/90 text-sm">
                ООО «БромС Ай Ти» <br />
                ИНН: 6453169905 <br />
                г. Саратов, ул. Примерная, д. 1
              </p>
            </div>

            {/* Навигация */}
            <div>
              <h4 className="text-white text-lg font-semibold mb-3 tracking-wide">
                Навигация
              </h4>
              <ul className="space-y-1.5">
                {LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group inline-flex items-center gap-2 text-neutral-300 hover:text-white transition text-sm"
                    >
                      <span className="relative">
                        {l.label}
                        <span className="pointer-events-none absolute -bottom-0.5 left-0 h-[1.5px] w-0 bg-white/80 transition-all duration-300 group-hover:w-full" />
                      </span>
                      <svg
                        className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Контакты */}
            <div>
              <h4 className="text-white text-lg font-semibold mb-3 tracking-wide">
                Контакты
              </h4>
              <p className="leading-relaxed text-sm">
                Email:{" "}
                <a className="link" href="mailto:bromsit@mail.ru">
                  bromsit@mail.ru
                </a>
                <br />
                Телефон:{" "}
                <a className="link" href="tel:+79172134586">
                  +7 (917) 213-45-86
                </a>
              </p>
            </div>

            {/* Соцсети */}
            <div>
              <h4 className="text-white text-lg font-semibold mb-3 tracking-wide">
                Мы в соцсетях
              </h4>
              <div className="flex items-center gap-3">
                <Social href="https://vk.com" label="VK">
                  <path d="M3 7c0-1.1.9-2 2-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  <path d="M7 9h2.1c.2 1 .6 1.9 1.2 2.7.5.7 1.2 1.3 2 1.6 0 0 .2.1.3 0 .2 0 .3-.3.4-.5l.3-.8c.1-.3.3-.6.6-.7.2-.1.5 0 .7.1l1.8 1.3c.2.1.4.3.4.5 0 .2-.1.3-.2.5-.7.9-1.5 1.6-2.5 2.1-1 .5-2.1.8-3.3.8-1.1 0-2.1-.2-3.1-.7a6.8 6.8 0 01-2.3-1.9A8.8 8.8 0 017 9z" />
                </Social>
                <Social href="https://t.me/yourhandle" label="Telegram">
                  <path d="M21.5 4.5L3.7 11.6c-.8.3-.8 1.5 0 1.8l4.3 1.5 1.6 4.8c.3.9 1.5 1 1.9.2l2.4-4.3 4.6 3.4c.7.5 1.7.1 1.9-.8l2.4-12c.2-.9-.7-1.6-1.6-1.2z" />
                </Social>
                <Social href="https://github.com/SvytoslavBorisov" label="GitHub">
                  <path d="M12 2a10 10 0 00-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.9.6-3.5-1.2-3.5-1.2-.5-1.1-1.2-1.4-1.2-1.4-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 .1 1.6-.7 1.8-1 .1-.7.4-1.1.7-1.4-2.3-.3-4.7-1.1-4.7-5a3.9 3.9 0 011-2.7c-.1-.3-.5-1.4.1-2.9 0 0 .9-.3 2.9 1.1a9.9 9.9 0 015.2 0c2-1.4 2.9-1.1 2.9-1.1.6 1.5.2 2.6.1 2.9a3.9 3.9 0 011 2.7c0 3.9-2.4 4.7-4.7 5 .4.3.8 1 .8 2.1v3.1c0 .3.2.7.8.5A10 10 0 0012 2z" />
                </Social>
              </div>
            </div>
          </div>

          {/* Нижняя плашка */}
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

/* Соц-иконки */
function Social({
  href,
  label,
  children,
}: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="group inline-flex h-10 w-10 items-center justify-center rounded-xl
                 bg-white/10 ring-1 ring-white/15 hover:ring-white/30 hover:bg-white/15
                 transition relative overflow-hidden"
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      <span className="pointer-events-none absolute -left-6 -top-6 h-8 w-16 rotate-45 bg-white/20 group-hover:translate-x-16 transition-transform duration-700" />
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-white/90 group-hover:scale-110 transition-transform duration-300"
        fill="currentColor"
        aria-hidden
      >
        {children}
      </svg>
    </Link>
  );
}
