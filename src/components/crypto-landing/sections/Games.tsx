"use client";

import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { btn } from "../ui/btnPresets";
import { gamesList } from "../data/landingData";

export default function Games() {
  return (
    <section id="games" className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Игры</h2>
        <p className="text-sm text-white/70">Все игры доступны прямо в браузере.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {gamesList.map((g, i) => (
          <Card key={i} className="h-full bg-white/5 border-white/10">
            <CardHeader className="space-y-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <Gamepad2 className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-lg text-white">{g.title}</CardTitle>
              <CardDescription className="text-sm leading-relaxed text-white/70">{g.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className={btn.linkPill} variant="ghost">
                <Link href={g.link}>Играть</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
