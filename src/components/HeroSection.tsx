// components/HeroSection.tsx
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function HeroSection() {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // точка перехода -- 768px (md)
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    // установить первый раз
    setIsMobile(mql.matches);

    // слушаем изменения
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  if (isMobile) {
    // мобильная версия
    return (
      <section className="relative w-full bg-white min-h-screen flex items-center justify-center">
        <div className="mx-auto max-w-6xl flex flex-col items-center justify-center space-y-12 h-full px-4 sm:px-6 lg:px-8">
          {/* Логотип */}
          <div className="w-64 h-64 relative">
            <Image
              src="/logo.jpg"
              alt="БромС"
              fill
              className="object-contain object-center"
            />
          </div>

          {/* Список */}
          <div className="text-center">
            <ul className="space-y-6 text-4xl font-light text-gray-800">
              <li>Чистый UI</li>
              <li>Чистый код</li>
              <li>Чистое IT-решение</li>
            </ul>
          </div>

          {/* Стрелка вниз */}
          <div className="absolute bottom-8 flex justify-center w-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-gray-400 animate-bounce"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>
    );
  }

  // десктопная версия
  return (
    <section className="w-full bg-white py-16">
      <div className="mx-auto max-w-6xl flex flex-row items-center">
        {/* Левая колонка с лого */}
        <div className="w-1/2 flex justify-center items-center">
          <div className="w-80 h-80 relative">
            <Image
              src="/logo.jpg"
              alt="БромС"
              fill
              className="object-contain object-center"
            />
          </div>
        </div>

        {/* Вертикальная линия */}
        <div className="w-px h-68 bg-gray-300 mx-8" />

        {/* Правая колонка со списком */}
        <div className="w-1/2 text-center">
          <ul className="space-y-6 text-4xl font-light text-gray-800">
            <li>Чистый UI</li>
            <li>Чистый код</li>
            <li>Чистое IT-решение</li>
          </ul>
        </div>
      </div>

      {/* Стрелка вниз */}
      <div className="mt-12 flex justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-8 h-8 text-gray-400 animate-bounce"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
