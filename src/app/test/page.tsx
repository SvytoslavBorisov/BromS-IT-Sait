// src/app/tex-demo/page.tsx
"use client";
import { useState } from "react";
import RenderTexClient from "@/lib/blog/RenderTexClient";

// сюда просто вставь ВЕСЬ свой файл (и YAML, и \documentclass, и всё остальное)
const RAW = ``;

export default function Page() {
  const [src, setSrc] = useState(RAW);
  return (
    <main className="p-6">
      <textarea value={src} onChange={(e) => setSrc(e.target.value)}
        className="w-full h-64 p-3 rounded border font-mono text-sm" />
      <div className="mt-6">
        <RenderTexClient source={src} />
      </div>
    </main>
  );
}