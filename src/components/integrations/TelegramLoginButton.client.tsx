"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

declare global { interface Window { tgAuthCallback?: (user: any) => void } }

type Props = {
  botUsername: string; // без @
  size?: "small" | "medium" | "large";
  cornerRadius?: number;
  requestAccessWrite?: boolean;
  refreshAfterLink?: boolean;
};

export default function TelegramLoginButtonClient({
  botUsername,
  size = "large",
  cornerRadius = 12,
  requestAccessWrite = true,
  refreshAfterLink = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current) return;

    window.tgAuthCallback = async (user: any) => {
      try {
        // полезно увидеть что реально пришло
        console.log("TG user payload:", user);

        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
          credentials: "same-origin",
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err?.error || `Telegram link failed (${res.status})`);
          return;
        }
        if (refreshAfterLink) router.refresh();
      } catch (e: any) {
        alert(e?.message || "Telegram link failed");
      }
    };

    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", botUsername);
    s.setAttribute("data-size", size);
    s.setAttribute("data-userpic", "true");
    if (requestAccessWrite) s.setAttribute("data-request-access", "write");
    s.setAttribute("data-radius", String(cornerRadius));
    // ВАЖНО: именно вызов с аргументом user
    s.setAttribute("data-onauth", "tgAuthCallback(user)");

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(s);

    return () => {
      delete window.tgAuthCallback;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [botUsername, size, cornerRadius, requestAccessWrite, refreshAfterLink, router]);

  return <div ref={containerRef} className="inline-flex items-center justify-center" />;
}
