// components/footer/FooterColumns.tsx
"use client";

import Link from "next/link";
import React from "react";
import Social from "./Social";

const LINKS = [
  { href: "/", label: "Главная" },
  { href: "/about", label: "О нас" },
  { href: "/services", label: "Услуги" },
  { href: "/portfolio", label: "Портфолио" },
  { href: "/contact", label: "Контакты" },
] as const;

export default function FooterColumns() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 p-8 md:p-12">
      {/* Компания */}
      <div>
        <h4 className="text-white text-lg font-semibold mb-3 tracking-wide">
          БромС&nbsp;Ай&nbsp;Ти
        </h4>
        <p className="leading-relaxed text-neutral-300/90 text-sm">
          ООО «БромС Ай Ти» <br />
          ИНН: 6453169905 <br />
          г. Саратов, ул. Рахова, д. 61/71
        </p>
      </div>

      {/* Навигация */}
      <div>
        <h4 className="text-white text-lg font-semibold mb-3 tracking-wide">Навигация</h4>
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
        <h4 className="text-white text-lg font-semibold mb-3 tracking-wide">Контакты</h4>
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
        <h4 className="text-white text-lg font-semibold mb-3 tracking-wide">Мы в соцсетях</h4>
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
  );
}
