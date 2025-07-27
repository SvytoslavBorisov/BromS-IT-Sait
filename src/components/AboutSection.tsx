"use client";

import React from "react";

export default function AboutSection() {
  return (
    <section className="w-full bg-gray-50 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Левая колонка: заголовок */}
        <div className="flex justify-start">
          <h2 className="text-4xl font-bold text-gray-900">О нас</h2>
        </div>

        {/* Правая колонка: описание и услуги */}
        <div className="space-y-6">
          <p className="text-lg text-gray-700 leading-relaxed">
            Мы — компания «БромС», специализирующаяся на разработке современных IT-решений
            для бизнеса. Наша команда профессионалов создаёт веб-приложения, мобильные
            сервисы и интегрирует корпоративные системы, обеспечивая высокую
            производительность, безопасность и удобство использования.
          </p>

          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Наши услуги:</h3>
            <ul className="space-y-2 list-disc list-inside text-gray-700">
              <li>Разработка веб-приложений (Next.js, React, Node.js)</li>
              <li>Мобильная разработка (iOS, Android, React Native)</li>
              <li>Интеграция и настройка корпоративных CRM/ERP</li>
              <li>Внедрение систем безопасности и шифрования</li>
              <li>Техническая поддержка и сопровождение проектов</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
