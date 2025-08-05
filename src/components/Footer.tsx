"use client";

import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const links = [
    { href: "/", label: "Главная" },
    { href: "/about", label: "О нас" },
    { href: "/services", label: "Услуги" },
    { href: "/portfolio", label: "Портфолио" },
    { href: "/contact", label: "Контакты" },
  ];

  return (
    <footer className="w-full bg-[rgb(5,5,5)] text-gray-300 font-sans">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <h3 className="text-white text-lg font-semibold mb-4">Компания</h3>
          <p>
            ООО БромС Ай Ти<br />
            ИНН: 6453169905<br />
            г. Саратов, ул. Примерная, д. 1
          </p>
        </div>

        <div>
          <h3 className="text-white text-lg font-semibold mb-4">Навигация</h3>
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-white text-lg font-semibold mb-4">Контакты</h3>
          <p>
            Email: bromsit@mail.ru<br />
            Телефон: +7 (917) 213-45-86
          </p>
        </div>

        <div>
          <h3 className="text-white text-lg font-semibold mb-4">Мы в соцсетях</h3>
          <div className="flex space-x-4">
            <Link href="#" className="hover:text-white">
              VK
            </Link>
            <Link href="https://t.me/+fnL2WMHosstjY2Qy" className="hover:text-white">
              Telegram
            </Link>
            <Link href="https://github.com/SvytoslavBorisov" className="hover:text-white">
              GitHub
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 mt-8 pt-4 pb-4 text-center">
        <p>© {currentYear} ООО БромС Ай Ти. Все права защищены.</p>
      </div>
    </footer>
  );
}
