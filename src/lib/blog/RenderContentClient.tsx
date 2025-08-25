// RenderContentClient.tsx
"use client";

import dynamic from "next/dynamic";

const RenderTexClient = dynamic(() => import("./RenderTexClient"), {
  ssr: false,
  loading: () => <div>Загрузка LaTeX…</div>,
});

export default function RenderContentClient({
  type,
  source,
}: {
  type: "tex";
  source: string;
}) {
  if (type === "tex") return <RenderTexClient source={source} />;
  return null;
}
