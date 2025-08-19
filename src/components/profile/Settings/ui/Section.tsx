"use client";
import React from "react";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card">
      <div className="px-5 py-3 border-b text-sm font-semibold">{title}</div>
      <div className="px-5">{children}</div>
    </section>
  );
}
