// components/projects/ProjectsChips.tsx
"use client";

import React from "react";

export default function ProjectsChips({
  items,
}: { items: readonly string[] }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map((t) => (
        <span
          key={t}
          className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-black/10 shadow-sm"
        >
          {t}
        </span>
      ))}
    </div>
  );
}
