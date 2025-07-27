"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Главная" },
    { href: "/about", label: "О нас" },
    { href: "/services", label: "Услуги" },
    { href: "/portfolio", label: "Портфолио" },
    { href: "/contact", label: "Контакты" },
  ];

  return (
    <header className="w-full bg-white shadow-sm font-sans">
      <nav
        className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
        aria-label="Основная навигация"
      >
        <ul className="flex items-center justify-center h-16 space-x-12">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`
                    relative
                    px-3 py-2
                    text-lg
                    font-semibold
                    tracking-tight
                    transition-colors
                    hover:text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                    ${isActive ? "text-indigo-600" : "text-gray-700"}
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
