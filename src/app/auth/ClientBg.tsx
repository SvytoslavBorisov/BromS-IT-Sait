"use client";

import dynamic from "next/dynamic";

// Загружаем фон ТОЛЬКО на клиенте (никакого SSR)
const BackgroundGridAuth = dynamic(() => import("./BackgroundGridAuth"), {
    ssr: false,
    loading: () => null,
});

export default function ClientBg() {
  return <BackgroundGridAuth />;
}
