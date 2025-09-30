// components/landing/projects/ProjectsCarouselCard.tsx
"use client";

import React from "react";
import CarouselClient from "./CarouselClient";

interface Props {
  readonly sections: readonly string[];
}

export default function ProjectsCarouselCard({ sections }: Props) {
  return (
    <div className="relative w-full h-full">
      {/* Клиппер — без закруглений на мобилке, с плавными на десктопе */}
      <div className="absolute inset-0 overflow-hidden rounded-none md:rounded-xl bg-white">
        <CarouselClient sections={sections} basePath="/projects/" />

        {/* Белые фейды по краям */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 md:w-1 bg-gradient-to-r from-white via-white/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1 md:w-1 bg-gradient-to-l from-white via-white/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-3 md:h-2 bg-gradient-to-b from-white via-white/80 to-transparent" />

      </div>
    </div>
  );
}
