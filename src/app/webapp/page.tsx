"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        sendData: (data: string) => void;
      };
    };
  }
}

export default function WebAppPage() {
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.expand();
      tg.ready();
    }
  }, []);

  function onClick() {
    window.Telegram?.WebApp.sendData(JSON.stringify({ action: "clicked" }));
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px",
      }}
    >
      <h1>Добро пожаловать в Telegram Web App!</h1>
      <button
        onClick={onClick}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Отправить данные боту1
      </button>
    </div>
  );
}