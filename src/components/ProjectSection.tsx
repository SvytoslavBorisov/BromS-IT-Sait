"use client";

import React, { useEffect, useState } from "react";
import CarouselClient from "@/app/CarouselClient";

export default function ProjectsSection() {
  const [sections, setSections] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const baseFiles = ["first", "second"];
    const files = baseFiles.map((name) =>
      `/projects/${name}_${isMobile ? "mobile" : "desktop"}.html`
    );

    Promise.all(
      files.map((url) =>
        fetch(url)
          .then((res) => {
            if (!res.ok) throw new Error(`Не удалось загрузить ${url}`);
            return res.text();
          })
      )
    )
      .then((texts) => setSections(texts))
      .catch((err) => console.error(err));
  }, [isMobile]);

  // Если ещё нет содержимого — показываем лоадер
  if (sections.length === 0) {
    return (
      <section className="relative w-full overflow-hidden bg-gray-100">
        <div className="relative z-10 w-full text-center py-20 text-white">
          Загрузка...
        </div>
      </section>
    );
  }

  // --------- Мобильная версия ---------
  if (isMobile) {
    return (
      <section id='portfolio' className="relative w-full h-screen overflow-hidden bg-gray-100">
        {/* Градиент вверх */}
        
  <div className="absolute z-1 inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[rgb(5,5,5)] from-99% to-gray-100" />
        <div className="relative flex flex-col h-full bg-[rgb(5,5,5)]">
          {/* Заголовок сверху */}
          <div className="z-2 text-center pt-14 pb-8">
            <h2 className="text-3xl font-semibold text-white">Наши проекты</h2>
          </div>

          {/* Карусель, занимает всё остальное */}
          <div className="flex-1 z-2 flex items-center overflow-hidden">
            <CarouselClient sections={sections} />
          </div>
        </div>
      </section>
    );
  }

  // --------- Десктопная версия ---------
  return (
    <section id='portfolio' className="relative w-full overflow-hidden bg-gray-100">
      {/* Градиент вправо */}
      <div className="absolute inset-0 bg-gradient-to-r from-[rgb(5,5,5)] to-gray-100" />

      <div className="relative z-10 items-center">
        {/* Слева: карусель */}
        <div className="h-[500px] overflow-hidden">
          <CarouselClient sections={sections} />
        </div>
      </div>
    </section>
  );
}
