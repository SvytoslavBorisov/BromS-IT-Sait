// components/about/AboutCard.tsx
"use client";

import React from "react";
import { Stat } from "./AboutStats";
import IconCheck from "./IconCheck";

export default function AboutCard() {
  return (
    <div className="relative rounded-3xl bg-white ring-1 ring-black/10 shadow-sm p-5 md:p-8">
      <h3 className="text-2xl font-semibold">Что мы делаем</h3>

      <ul className="mt-4 space-y-4">
        <li className="flex gap-3">
          <IconCheck />
          <p className="leading-relaxed [text-wrap:balance]">
            Разработка веб-приложений{" "}
            <span className="font-medium">Next.js, React, Node.js</span>
          </p>
        </li>
        <li className="flex gap-3">
          <IconCheck />
          <p className="leading-relaxed [text-wrap:balance]">
            Мобильные приложения{" "}
            <span className="font-medium">iOS, Android, React Native</span>
          </p>
        </li>
        <li className="flex gap-3">
          <IconCheck />
          <p className="leading-relaxed [text-wrap:balance]">
            Интеграции и настройка корпоративных{" "}
            <span className="font-medium">CRM/ERP</span>
          </p>
        </li>
        <li className="flex gap-3">
          <IconCheck />
          <p className="leading-relaxed [text-wrap:balance]">
            Безопасность:{" "}
            <span className="font-medium">шифрование, подписи, аудит</span>
          </p>
        </li>
        <li className="flex gap-3">
          <IconCheck />
          <p className="leading-relaxed [text-wrap:balance]">
            Поддержка и развитие проектов
          </p>
        </li>
      </ul>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Stat label="Срок внедрения MVP" to={4} suffix="–8 нед." />
        <Stat label="Проектов в поддержке" to={24} />
        <Stat label="Средний TTV" to={14} suffix=" дн." />
        <Stat label="Измеримая цель" to={100} suffix="%" />
      </div>
    </div>
  );
}
