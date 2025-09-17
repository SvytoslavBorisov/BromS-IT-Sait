"use client";

import React from "react";

export function Logo({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid place-items-center size-8 rounded-xl border border-white/10 bg-gradient-to-br from-cyan-400/10 to-pink-400/10">
        <div className="size-3.5 rotate-45 rounded-md bg-[conic-gradient(at_50%_50%,#7cd6ff,#9cff7c,#ff6aa0,#7cd6ff)]" />
      </div>
      <div className="font-extrabold tracking-tight text-white/90">{title}</div>
    </div>
  );
}
