"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: "#about", label: "О нас" },
    { href: "#portfolio", label: "Портфолио" },
    { href: "#contact", label: "Контакты" },
  ];

  return (
    <header className="w-full bg-white shadow-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Desktop menu */}
        <nav className="hidden md:flex flex-1">
          <ul className="flex justify-around w-full">
            {links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={
                      `relative px-3 py-2 text-base font-light transition-colors hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                        isActive ? 'text-indigo-600' : 'text-gray-700'
                      }`
                    }
                    aria-current={isActive ? "page" : undefined}
                  >
                    {link.label}
                    {isActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <Menu />
        </button>
      </div>
      {/* Mobile menu panel */}
      {isOpen && (
        <nav className="md:hidden bg-white shadow-sm">
          <ul className="flex flex-col space-y-2 p-4">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="block text-base font-light text-gray-700 py-2"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
