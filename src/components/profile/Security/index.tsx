"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Level, LogEntry } from "@/types/logs";
import { groupByDate } from "./utils";
import LogItem from "./LogItem";
import SecurityFilters from "./SecurityFilters";

type Scope = "me" | "all";

export default function Security() {
  const { data: session } = useSession();
  const myUserId = (session?.user as any)?.id as string | undefined;

  const [scope, setScope] = useState<Scope>("me");
  const [level, setLevel] = useState<Level | "">("");
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("scope", scope);
    if (level) params.set("level", level);
    if (q) params.set("q", q);
    params.set("limit", "400");

    setLoading(true);
    fetch(`/api/logs?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        return res.json();
      })
      .then((data: LogEntry[]) => {
        setLogs(data);
        setError(null);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [scope, level, q]);

  const groups = useMemo(() => groupByDate(logs), [logs]);

  return (
    <div className="relative">
      {/* заголовок */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-9 w-9 rounded-2xl border flex items-center justify-center shadow-sm">
              <span className="text-sm font-semibold">SSS</span>
            </div>
            <div className="truncate">
              <h1 className="text-lg md:text-xl font-semibold leading-6 truncate">
                Безопасность
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm">
                Журнал безопасности и аудита
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* новая красивая панель фильтров */}
      <SecurityFilters
        scope={scope}
        setScope={setScope}
        level={level}
        setLevel={setLevel}
        q={q}
        setQ={setQ}
        myUserId={myUserId}
      />

      {/* список */}
      <Card className="mx-auto max-w-6xl mt-4">
        <CardHeader title="Логи безопасности" />
        <CardContent>
          {loading && (
            <div className="animate-pulse text-sm text-muted-foreground">
              Загрузка журнала…
            </div>
          )}
          {error && <p className="text-sm text-red-500">Ошибка: {error}</p>}
          {!loading && !error && logs.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Записей не найдено.
            </div>
          )}

          {!loading && !error && logs.length > 0 && (
            <ScrollArea className="h-[560px] rounded-lg ring-1 ring-border">
              <div className="divide-y">
                {groups.map(([day, items]) => (
                  <section key={day}>
                    <div className="sticky top-0 z-10 backdrop-blur bg-gray/70 px-4 py-2 text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                    <ul className="px-2">
                      {items.map((log, idx) => (
                        <LogItem key={`${day}-${idx}`} day={day} idx={idx} log={log} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
