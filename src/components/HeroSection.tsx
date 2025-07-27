"use client";

import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="w-full bg-white py-16">
      <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center">
        {/* Левая колонка с лого */}
        <div className="w-full md:w-1/2 flex justify-center md:justify-end">
          <div className="w-48 h-48 md:w-64 md:h-64 relative">
            <Image
            src="/logo.jpg"
            alt="БромС"
            fill
            style={{ objectFit: "contain" }}
            />
          </div>
        </div>

        {/* Вертикальная линия */}
        <div className="hidden md:block w-px h-48 bg-gray-300 mx-8" />

        {/* Правая колонка со списком */}
        <div className="w-full md:w-1/2">
          <ul className="space-y-6 text-2xl font-light text-gray-800">
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