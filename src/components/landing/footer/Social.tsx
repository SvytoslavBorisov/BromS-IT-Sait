// components/footer/Social.tsx
"use client";

import Link from "next/link";
import React from "react";

export default function Social({
  href,
  label,
  children,
}: { href: string; label: string; children: React.ReactNode }) {
  const isExternal = href.startsWith("http");
  return (
    <Link
      href={href}
      aria-label={label}
      className="group inline-flex h-10 w-10 items-center justify-center rounded-xl
                 bg-white/10 ring-1 ring-white/15 hover:ring-white/30 hover:bg-white/15
                 transition relative overflow-hidden"
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
    >
      <span className="pointer-events-none absolute -left-6 -top-6 h-8 w-16 rotate-45 bg-white/20 group-hover:translate-x-16 transition-transform duration-700" />
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-white/90 group-hover:scale-110 transition-transform duration-300"
        fill="currentColor"
        aria-hidden
      >
        {children}
      </svg>
    </Link>
  );
}
