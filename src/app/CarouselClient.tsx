"use client";
import React, { useState } from "react";

interface Props {
  sections: string[]; // массив HTML с <img> и вашим контентом
}

export default function CarouselClient({ sections }: Props) {
  const total = sections.length;
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  return (
    <div className="flex flex-col md:flex-row w-full h-full md:h-[500px] overflow-hidden">
      {/* Карусель: на мобильных full width, на md+ — 2/3 */}
      <div className="relative w-full md:w-2/3 h-full md:h-[300px] md:h-full overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {sections.map((html, idx) => (
            <div key={idx} className="relative flex-shrink-0 w-full h-full">
              {/* мобилки: сверху вниз, md+: слева направо */}
              <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-transparent to-[rgb(5,5,5)]" />
              <div
                className="relative z-10 w-full h-full"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          ))}
        </div>
        {/* Стрелки */}
        <button
          onClick={prev}
          className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 z-20"
        >
          ‹
        </button>
        <button
          onClick={next}
          className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 z-20"
        >
          ›
        </button>

        {/* Пагинация */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
          {sections.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`w-3 h-3 rounded-full transition ${
                idx === current ? "bg-indigo-500" : "bg-gray-600"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Заголовок: только на md+ */}
      <div className="hidden md:flex relative w-1/3 h-[500px] bg-[rgb(5,5,5)] items-center justify-center">
        {/* Градиент-оверлей: сверху чёрный, внизу белый, только на md+ */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-98% to-[rgb(255,255,255)] hidden md:block"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-transparent from-98% to-[rgb(255,255,255)] hidden md:block"></div>
        {/* Сам заголовок поверх градиента */}
        <h2 className="relative text-white text-[36px] font-semibold text-center">
          Наши проекты
        </h2>
      </div>
    </div>
  );
}