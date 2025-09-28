// Section.tsx
"use client";
import { PropsWithChildren } from "react";

export default function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section className="rounded-2xl border border-neutral-200 shadow-sm bg-white">
      <div className="px-5 py-4 border-b border-neutral-100">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
