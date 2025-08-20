"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import SessionsGrid from "./Shares/SessionsGrid";
import type { SessionSummary } from "./Shares/SessionCard";
import RecoverSecret from "./RecoverSecret";

export default function RecoverList() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/shares/sessions");
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        setSessions(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goCreateSession = () =>
    router.push("/profile?tab=keys&sub=keys.create");

  const handleRecover = (id: string) =>
    router.push(`/profile?tab=recover&session=${id}`);

  return (
    <div className="relative">
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-9 w-9 rounded-2xl border flex items-center justify-center shadow-sm">
                <span className="text-sm font-semibold">SSS</span>
              </div>
              <div className="truncate">
                <h1 className="text-lg md:text-xl font-semibold leading-6 truncate">
                  Восстановление секрета
                </h1>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Выберите сессию или начните новую
                </p>
              </div>
            </div>

          <Button onClick={goCreateSession} className="mt-2 rounded-2xl w-fit">
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <Plus className="h-4 w-4 shrink-0" />
              <span>Начать новую сессию</span>
            </span>
          </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6">
        {loading ? (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader title="Загрузка сессий…" />
            <CardContent>
              <div className="animate-pulse space-y-4">
                <div className="h-24 rounded-xl bg-muted" />
                <div className="h-24 rounded-xl bg-muted" />
              </div>
            </CardContent>
          </Card>
        ) : !sessions.length ? (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader title="Выберите сессию для восстановления" />
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="h-16 w-16 rounded-2xl border shadow-sm flex items-center justify-center">
                  <span className="text-base font-semibold">∑</span>
                </div>
                <h2 className="text-base md:text-lg font-medium">
                  Нет активных сессий разделения
                </h2>
                <p className="text-muted-foreground text-sm max-w-md">
                  Создайте новую сессию, чтобы поделить секрет и затем
                  восстановить его при достижении порога.
                </p>
                <Button onClick={goCreateSession} className="mt-2 rounded-2xl w-fit">
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>Начать новую сессию</span>
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader title="Все разделённые секреты" />
              <CardContent>
                <SessionsGrid
                  sessions={sessions}
                  onRecover={handleRecover}
                  onDetails={(id) => router.push(`/profile?tab=session&id=${id}`)}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader title="Выберите сессию для восстановления" />
              <CardContent>
                <RecoverSecret />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
