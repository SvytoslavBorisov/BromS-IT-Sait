// src/lib/captcha/turnstile-client.ts
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      execute: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<void> | null = null;

export async function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.turnstile) return;
  if (!loading) {
    loading = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("turnstile_load_failed"));
      document.head.appendChild(s);
    });
  }
  return loading;
}

export async function runTurnstile({
  action,
  cdata,
}: {
  action: "login" | "register" | "resend";
  cdata: string;
}): Promise<string> {
  await loadTurnstile();
  if (!window.turnstile) throw new Error("turnstile_unavailable");

  return new Promise<string>((resolve, reject) => {
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.left = "-99999px";
    el.style.top = "0";
    document.body.appendChild(el);

    const widgetId = window.turnstile!.render(el, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
      size: "invisible",
      action,
      cdata,
      callback: (token: string) => {
        resolve(token);
        try {
          window.turnstile?.remove(widgetId);
          el.remove();
        } catch {}
      },
      "error-callback": () => {
        reject(new Error("captcha_error"));
        try {
          window.turnstile?.remove(widgetId);
          el.remove();
        } catch {}
      },
      "timeout-callback": () => {
        reject(new Error("captcha_timeout"));
        try {
          window.turnstile?.remove(widgetId);
          el.remove();
        } catch {}
      },
    });

    window.turnstile!.execute(widgetId);
  });
}
