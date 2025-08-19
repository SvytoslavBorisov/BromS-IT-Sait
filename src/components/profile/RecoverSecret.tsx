// components/shares/RecoverSecret.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CalendarClock, Users, Play, RotateCw, Trash2, ShieldCheck } from "lucide-react";

type RecoverSummary = {
  id: string;
  createdAtISO: string;
  status: string;               // PENDING / IN_PROGRESS / FINISHED ...
  role: "DEALER" | "SHAREHOLDER";
  shareSessionId: string;
  participants: number;
  isActive: boolean;
};

function timeAgo(iso: string) {
  const dt = new Date(iso);
  const diff = Date.now() - dt.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} дн назад`;
}

export default function RecoverSecret() {
  const [sessions, setSessions] = useState<RecoverSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/recoverSessions");
        if (!res.ok) throw new Error("Не удалось загрузить сессии восстановления");
        const data: RecoverSummary[] = await res.json();
        setSessions(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/recoverSessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось удалить сессию");
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (e: any) {
      console.error(e);
      alert("Ошибка при удалении: " + e.message);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader title="Загрузка…" />
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 rounded-xl bg-muted" />
            <div className="h-20 rounded-xl bg-muted" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader title="Ошибка" />
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!sessions.length) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader title="Сессии восстановления" />
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Нет сессий восстановления. Как только вы начнёте процесс — он появится здесь.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map(s => {
        const statusVariant =
          s.status === "FINISHED" ? "secondary"
          : s.isActive ? "default"
          : "outline";

        // Прогресс здесь условный (нет данных о t/k) – показываем “активность” (0/100/100)
        const progress = s.status === "FINISHED" ? 100 : s.isActive ? 60 : 0;

        return (
          <Card key={s.id} className="rounded-2xl shadow-sm border">
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full" variant={statusVariant as any}>
                      {s.status === "FINISHED" ? "Завершена"
                        : s.isActive ? "Активна"
                        : "Ожидает"}
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {s.role === "DEALER" ? "Вы — дилер" : "Вы — участник"}
                    </Badge>
                  </div>

                  <div className="mt-2 text-base font-semibold leading-6 truncate">
                    Восстановление #{s.id.slice(0, 6)}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarClock className="h-4 w-4" />
                      <span>создано {timeAgo(s.createdAtISO)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>участников: {s.participants}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <Progress value={progress} />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {s.isActive ? (
                    <Button
                      onClick={() => router.push(`/profile/recover_secret/${s.id}`)}
                      className="rounded-2xl"
                      aria-label="Продолжить восстановление"
                    >
                      <RotateCw className="mr-2 h-4 w-4" />
                      Продолжить
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/profile/recover_secret/${s.shareSessionId}`)}
                      className="rounded-2xl"
                      aria-label="Начать восстановление"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Начать
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    onClick={() => handleDelete(s.id)}
                    className="rounded-2xl"
                    aria-label="Удалить"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => router.push(`/profile?tab=session&id=${s.shareSessionId}`)}
                    className="rounded-2xl"
                    aria-label="Детали исходной сессии"
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Детали
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
