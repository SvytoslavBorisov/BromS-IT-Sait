"use client";
import React, { useState } from "react";

interface Props {
  sections: string[]; // массив HTML, каждый содержит <img> и остальной контент, который мы не рендерим здесь
}

export default function CarouselClient({ sections }: Props) {
  const total = sections.length;
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  return (
    <div className="relative flex w-full h-[500px] bg-black">
      {/* ЛЕВАЯ КОЛОНКА: изображение + градиент */}
      <div className="relative w-2/3 h-full overflow-hidden">
        {/* Слайдер изображений */}
        <div
          className="flex h-full transition-transform duration-500"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {sections.map((html, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 w-full h-full"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ))}
        </div>

        {/* Градиент-оверлей, чтобы справа картинка таяла в чёрный */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent to-black" />
      </div>

      {/* Стрелки навигации */}
      <button
        onClick={prev}
        className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-40 text-white rounded-full p-2"
      >
        ‹
      </button>
      <button
        onClick={next}
        className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-40 text-white rounded-full p-2"
      >
        ›
      </button>

      {/* Точки-пагинация */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {sections.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-3 h-3 rounded-full transition-colors ${
              idx === current ? "bg-indigo-500" : "bg-gray-600"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
