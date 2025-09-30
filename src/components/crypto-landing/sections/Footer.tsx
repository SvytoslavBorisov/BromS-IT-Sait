"use client";

import Link from "next/link";
import { Github, Linkedin, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative border-t border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,.85),rgba(0,0,0,.7))]">
      {/* мягкая сетка */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[.05]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-12">
        {/* верхняя часть с навигацией и соцсетями */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Broms IT</h3>
            <p className="mt-1 text-sm text-white/70">
              Криптография с заботой о приватности.
            </p>
          </div>

          <nav className="flex gap-6 text-sm text-white/70">
            <Link href="#about" className="hover:text-white transition">О нас</Link>
            <Link href="#portfolio" className="hover:text-white transition">Проекты</Link>
            <Link href="#contact" className="hover:text-white transition">Контакты</Link>
          </nav>

          <div className="flex gap-4">
            <Link href="https://github.com" target="_blank" aria-label="GitHub"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition">
              <Github className="h-4 w-4 text-white" />
            </Link>
            <Link href="https://linkedin.com" target="_blank" aria-label="LinkedIn"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition">
              <Linkedin className="h-4 w-4 text-white" />
            </Link>
            <Link href="mailto:bromsit@mail.ru" aria-label="Email"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition">
              <Mail className="h-4 w-4 text-white" />
            </Link>
          </div>
        </div>

        {/* разделитель */}
        <div className="my-8 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        {/* нижняя часть */}
        <div className="flex flex-col md:flex-row items-center justify-between text-xs text-white/50">
          <p>© {new Date().getFullYear()} Broms IT. Все права защищены.</p>
          <p className="mt-2 md:mt-0">
            Сделано с ❤ в Саратове
          </p>
        </div>
      </div>
    </footer>
  );
}
