"use client";
import { useEffect } from "react";

declare global { interface Window { Telegram?: any } }

export default function Game() {
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;
      tg?.ready();
      tg?.expand?.();
    } catch {}
  }, []);

  return (
    <div style={{height: "100vh", width: "100vw"}}>
      <iframe
        src="/game/index.html"
        style={{border: "0", width: "100%", height: "100%"}}
        title="MiniApp"
      />
    </div>
  );
}
