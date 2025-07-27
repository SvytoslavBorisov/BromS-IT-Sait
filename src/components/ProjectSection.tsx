"use client";

import React, { useEffect, useState } from "react";
import CarouselClient from "@/app/main/CarouselClient";

export default function ProjectsSection() {
  const [sections, setSections] = useState<string[]>([]);
  
  useEffect(() => {
    // Названия файлов из public/templates/projects
    const files = [
      "first.html",
      "second.html",
      "third.html",
      "fours.html"
    ];

    // Загружаем каждый файл как текст
    Promise.all(
      files.map((file) =>
        fetch(`/projects/${file}`)
          .then((res) => {
            if (!res.ok) throw new Error(`Не удалось загрузить ${file}`);
            return res.text();
          })
      )
    )
      .then((texts) => setSections(texts))
      .catch((err) => console.error(err));
  }, []);

  return (
    <section className="w-full bg-black">
      <div className="max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Слева: карусель с секциями из HTML */}
        <div className="w-full">
          {sections.length > 0 ? (
            <CarouselClient sections={sections} />
          ) : (
            <div className="text-white text-center">Загрузка...</div>
          )}
        </div>

        {/* Справа: заголовок */}
        <div className="w-full flex justify-end">
          <h2 className="text-4xl font-bold text-white">Наши проекты</h2>
        </div>
      </div>
    </section>
  );
}
