"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { btn } from "../ui/btnPresets";

export default function CTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-2">
      <Card className="overflow-hidden border-dashed bg-white/5 border-white/15">
        <div className="grid gap-6 p-6 md:grid-cols-[1.5fr,1fr] md:p-10">
          <div>
            <h3 className="text-2xl md:text-3xl font-semibold text-white">Нужен корпоративный сценарий?</h3>
            <p className="mt-2 text-white/70">
              Интегрируем криптографию в ваши процессы: электронный документооборот, подписи и пороговое хранение секретов.
            </p>
          </div>
          <div className="flex items-center md:justify-end">
            <Button size="lg" asChild className={btn.primary}>
              <Link href="/contact">Связаться</Link>
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
