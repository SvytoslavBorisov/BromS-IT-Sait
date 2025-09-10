// components/ui/FeatureCardShell.tsx
"use client";

import React from "react";
import { Card, CardHeader } from "@/components/ui/card";

export function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="group relative rounded-2xl p-[1px]
                 bg-[conic-gradient(from_210deg,rgba(255,255,255,.12),rgba(255,255,255,.02),rgba(255,255,255,.12))]"
    >
      <Card
        className="h-full rounded-[1rem] border border-white/10 overflow-hidden
                   bg-[linear-gradient(180deg,rgba(0,0,0,.78),rgba(0,0,0,.52))]
                   shadow-[0_20px_80px_-30px_rgba(0,0,0,.8)]"
      >
        {/* глянец по краю */}
        <span className="pointer-events-none absolute inset-0 rounded-[1rem] ring-1 ring-inset ring-white/10" />
        {/* лёгкая точечная сетка */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[.06]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <CardHeader className="relative space-y-3">{children}</CardHeader>
      </Card>
    </div>
  );
}

export function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl
                 bg-[linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.06))]
                 ring-1 ring-white/15"
    >
      {children}
    </div>
  );
}
