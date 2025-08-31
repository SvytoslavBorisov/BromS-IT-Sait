"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { btn } from "../ui/btnPresets";
import { articlePlaceholders } from "../data/landingData";

export default function Articles() {
  return (
    <section id="articles" className="mx-auto max-w-6xl px-6 py-6 md:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">Статьи</h2>
        <Button asChild className={btn.linkGhostDark} variant="ghost">
          <Link href="/crypto/blog">
            Все статьи <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {articlePlaceholders.map((a, i) => (
          <Card key={i} className="group h-full overflow-hidden bg-white/5 border-white/10">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full bg-white/10 text-white border border-white/15">
                  {a.tag}
                </Badge>
              </div>
              <CardTitle className="text-xl leading-snug text-white">
                <Link href="#" className="transition-colors group-hover:text-white/90">
                  {a.title}
                </Link>
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-white/70">{a.excerpt}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className={btn.linkPill} variant="ghost">
                <Link href={a.link}>
                  Читать <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
