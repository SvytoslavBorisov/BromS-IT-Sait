// components/ContactForm.tsx
"use client";

import React, { FormEvent, useMemo, useState } from "react";

type State = "idle" | "sending" | "ok" | "error";

export default function ContactForm() {
  const [state, setState] = useState<State>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [agree, setAgree] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const canSend = useMemo(() => {
    const hasContact = email.trim() || phone.trim();
    const hasMsg = message.trim().length >= 10;
    return name.trim().length >= 2 && hasContact && hasMsg && agree && state !== "sending";
  }, [name, email, phone, message, agree, state]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSend) return;

    setState("sending");
    setErr(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });
      if (!res.ok) {
        // пробуем вытащить { error } из JSON
        let msg = "Не удалось отправить сообщение";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          msg = await res.text();
        }
        throw new Error(msg);
      }
      setState("ok");
      setName(""); setEmail(""); setPhone(""); setMessage("");
    } catch (e: any) {
      setErr(e?.message ?? "Не удалось отправить сообщение");
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  };

  if (state === "ok") {
    return (
      <div className="flex flex-col items-center text-center py-12">
        <div className="relative h-16 w-16 rounded-full bg-emerald-500 text-white grid place-items-center shadow-lg">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span className="pointer-events-none absolute inset-0 rounded-full ring-8 ring-emerald-500/30 animate-ping" />
        </div>
        <h3 className="mt-6 text-xl font-semibold">Сообщение отправлено</h3>
        <p className="mt-2 text-neutral-600">Мы свяжемся с вами в ближайшее время.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Имя */}
      <Field>
        <Input
          id="name"
          value={name}
          onChange={setName}
          label="Имя"
          autoComplete="name"
          required
        />
      </Field>

      {/* Email / Телефон */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={setEmail}
            label="Email"
            autoComplete="email"
          />
        </Field>
        <Field>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={setPhone}
            label="Телефон"
            autoComplete="tel"
            placeholder="+7 900 000-00-00"
          />
        </Field>
      </div>

      {/* Сообщение */}
      <Field>
        <Textarea
          id="message"
          value={message}
          onChange={setMessage}
          label="Сообщение"
          rows={5}
          required
        />
      </Field>

      {/* Согласие */}
      <label className="mt-2 flex items-start gap-3 text-sm text-neutral-700">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-black"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        <span>
          Нажимая «Отправить», вы соглашаетесь с обработкой персональных данных в целях обратной связи.
        </span>
      </label>

      {/* Ошибка */}
      {state === "error" && err && (
        <p className="text-sm text-red-600">{err}</p>
      )}

      {/* Кнопка */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={!canSend}
          className={`group inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium
                      shadow-lg transition will-change-transform
                      ${canSend ? "bg-black text-white hover:-translate-y-0.5" : "bg-black/20 text-black/50 cursor-not-allowed"}`}
        >
          {state === "sending" ? (
            <>
              <Spinner /> Отправка…
            </>
          ) : (
            <>
              Отправить
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

/* ===== Вспомогательные компоненты ===== */
function Field({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>;
}
function Input({
  id, label, value, onChange, type = "text", autoComplete, required, placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="relative group">
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        className="peer block w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 outline-none
                   ring-0 transition placeholder-transparent
                   focus:border-black/20 focus:bg-white focus:shadow-[0_10px_40px_-20px_rgba(0,0,0,.35)]"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-3 text-sm text-neutral-500 transition-all
                   peer-placeholder-shown:top-3 peer-placeholder-shown:text-neutral-500
                   peer-focus:-top-2 peer-focus:text-xs peer-focus:text-neutral-600
                   peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-xs"
      >
        {label}
      </label>
      {placeholder && <span className="sr-only">{placeholder}</span>}
    </div>
  );
}
function Textarea({
  id, label, value, onChange, rows = 5, required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div className="relative group">
      <textarea
        id={id}
        rows={rows}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        className="peer block w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 outline-none
                   ring-0 transition placeholder-transparent resize-y
                   focus:border-black/20 focus:bg-white focus:shadow-[0_10px_40px_-20px_rgba(0,0,0,.35)]"
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-3 text-sm text-neutral-500 transition-all
                   peer-placeholder-shown:top-3 peer-placeholder-shown:text-neutral-500
                   peer-focus:-top-2 peer-focus:text-xs peer-focus:text-neutral-600
                   peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:text-xs"
      >
        {label}
      </label>
    </div>
  );
}
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4A4 4 0 0 0 8 12H4z"/>
    </svg>
  );
}
