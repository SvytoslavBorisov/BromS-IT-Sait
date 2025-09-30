// components/projects/ProjectsActions.tsx
"use client";

import React from "react";

export default function ProjectsActions() {
  return (
    <div className="mt-8 flex flex-wrap gap-2">
      <a
        href="#contact"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-black/20"
      >
        Обсудить проект
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </a>
      <a
        href="/portfolio"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-medium ring-1 ring-black/10 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/20"
      >
        Все кейсы
      </a>
    </div>
  );
}
