// components/AboutSection.tsx
"use client";

import React from "react";

export default function AboutSection() {
  return (
    <section id="about" className="relative overflow-hidden min-h-screen md:min-h-[500px] md:h-auto w-full bg-gray-100 py-16">
      {/* Градиент-оверлей на весь section */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-20 from-98% to-white" />

      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row w-full">
          {/* Заголовок */}
          <div className="w-full md:w-1/3 flex items-center justify-center mb-6 md:mb-0">
            <h2 className="text-4xl font-bold text-gray-900 text-center">
              О нас
            </h2>
          </div>

          {/* Контент */}
          <div className="w-full md:w-2/3 flex items-center justify-center">
            <div className="w-full space-y-6 text-center">
              <p className="text-lg text-gray-700 leading-relaxed mx-auto">
                Мы — компания «БромС», специализирующаяся на разработке современных IT-решений
                для бизнеса. Наша команда профессионалов создаёт веб-приложения, мобильные
                сервисы и интегрирует корпоративные системы, обеспечивая высокую
                производительность, безопасность и удобство использования.
              </p>
              <div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                  Наши услуги:
                </h3>
                <div className="inline-block space-y-2 list-disc list-inside text-gray-700 text-center">
                  <p>Разработка веб-приложений (Next.js, React, Node.js)</p>
                  <p>Мобильная разработка (iOS, Android, React Native)</p>
                  <p>Интеграция и настройка корпоративных CRM/ERP</p>
                  <p>Внедрение систем безопасности и шифрования</p>
                  <p>Техническая поддержка и сопровождение проектов</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
