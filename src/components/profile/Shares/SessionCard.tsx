"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/cards";
import { Progress } from "@/components/ui/progress";
import { CalendarClock, KeySquare, Play, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type SessionSummary = {
  id: string;
  createdAtISO: string;
  threshold: number;
  nShares: number;
  collected: number;
  scheme: "CUSTOM" | "ASYMMETRIC";
  title?: string | null;
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

export default function SessionCard({
  item,
  onRecover,
  onDetails,
}: {
  item: SessionSummary;
  onRecover: (id: string) => void;
  onDetails?: (id: string) => void;
}) {
  const pct = item.threshold === 0 ? 0 : Math.min(100, Math.round(item.collected / item.threshold * 100));
  const ready = item.collected >= item.threshold;

  return (
    <Card className="rounded-2xl shadow-sm border">
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl border flex items-center justify-center">
                <KeySquare className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full">
                  {item.scheme === "ASYMMETRIC" ? "Asymmetric" : "Custom"}
                </Badge>
                <Badge
                  className={cn(
                    "rounded-full",
                    ready ? "bg-emerald-600 text-white hover:bg-emerald-600" : "bg-amber-500 text-white hover:bg-amber-500"
                  )}
                >
                  {ready ? "Готово к восстановлению" : "Ждём доли"}
                </Badge>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <div className="text-base font-semibold leading-6 truncate">
                {item.title ?? `Сессия #${item.id.slice(0, 6)}`}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                <span>Создано: {timeAgo(item.createdAtISO)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-muted-foreground">Порог</div>
            <div className="text-xl font-semibold leading-none">{item.threshold}</div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Прогресс до порога</span>
            <span className="font-medium">
              {item.collected}/{item.threshold}
            </span>
          </div>
          <Progress value={pct} className="h-2 rounded-full" />
          <div className="text-xs text-muted-foreground">
            Всего долей: {item.nShares}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            onClick={() => onRecover(item.id)}
            className="rounded-2xl"
            aria-label="Начать восстановление"
          >
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
             <Play className="h-4 w-4" />
             Восстановить
            </span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => onDetails?.(item.id)}
            className="rounded-2xl"
            aria-label="Подробнее"
          >
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <ShieldCheck className="h-4 w-4" />
              Детали
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
