"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { features } from "../data/landingData";

export default function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <div className="grid gap-6 md:grid-cols-3">
        {features.map((f, i) => (
          <div key={f.title} className="animate-in fade-in slide-in-from-bottom-1 duration-300" style={{ animationDelay: `${i * 60}ms` }}>
            <Card className="h-full bg-white/5 border-white/10">
              <CardHeader className="space-y-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-xl text-white">{f.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed text-white/70">{f.text}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
}
