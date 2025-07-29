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
    <section className="w-full overflow-hidden bg-[rgb(5,5,5)]">
      <div className="items-center overflow-hidden">
        {/* Слева: карусель с секциями из HTML */}
        <div className="w-full">
          {sections.length > 0 ? (
            <CarouselClient sections={sections} />
          ) : (
            <div className="text-white text-center">Загрузка...</div>
          )}
        </div>
      </div>
    </section>
  );
}
