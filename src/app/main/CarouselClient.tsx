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
    <div className="flex w-full h-[500px] overflow-hidden">
      {/* Карусель: 2/3 ширины */}
      <div className="relative w-2/3 h-full overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500 overflow-hidden"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {sections.map((html, idx) => (
            <div key={idx} className="relative flex-shrink-0 w-full h-full overflow-hidden">
              {/* удалите стиль backgroundImage */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
              {/* пусть внутри будет только HTML со своим <img> */}
              <div className="relative z-10 w-full h-full" dangerouslySetInnerHTML={{ __html: html }} />
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

      {/* Правый блок: 1/3 ширины */}
      <div className="relative w-1/3 h-full bg-[rgb(5,5,5)] flex items-center justify-center overflow-hidden">

        {/* Заголовок поверх */}
        <h2 className="relative text-white text-[36px] font-semibold">
          Наши проекты
        </h2>
      </div>
    </div>
  );
}
