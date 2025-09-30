// components/contact/ContactCard.tsx
"use client";

import React from "react";
import ContactForm from "@/components/landing/contact/ContactForm";

export default function ContactCard() {
  return (
    <div
      className="relative rounded-2xl bg-white ring-1 ring-black/10 shadow-sm p-5 md:p-8"
      aria-label="Форма обратной связи"
    >
      <ContactForm />
    </div>
  );
}

