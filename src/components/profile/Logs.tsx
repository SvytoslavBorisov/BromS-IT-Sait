/* components/profile/Security.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { ScrollArea } from "@/components/ui/scroll-area";

type Level = "debug" | "info" | "warn" | "error";
interface LogEntry {
  timestamp: string;
  level: Level;
  event?: string;
  message?: string;
  userId?: string;
  requestId?: string;
  module?: string;
  [k: string]: any;
}

const levelStyle: Record<Level, string> = {
  debug: "bg-gray-100 text-gray-700 ring-gray-300",
  info:  "bg-cyan-100 text-cyan-900 ring-cyan-300",
  warn:  "bg-amber-100 text-amber-900 ring-amber-300",
  error: "bg-rose-100 text-rose-900 ring-rose-300",
};

const levelIcon: Record<Level, string> = {
  debug: "🧪",
  info: "📘",
  warn: "⚠️",
  error: "⛔",
};

function groupByDate(logs: LogEntry[]) {
  const map = new Map<string, LogEntry[]>();
  for (const l of logs) {
    const day = new Date(l.timestamp).toLocaleDateString("ru-RU");
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(l);
  }
  return Array.from(map.entries());
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Security() {
  const { data: session } = useSession();
  const myUserId = (session?.user as any)?.id as string | undefined;

  const [scope, setScope] = useState<"me" | "all">("me");
  const [level, setLevel] = useState<Level | "">("");
  const [q, setQ] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

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
        <div className="sticky top-0 z-20 bg-white border-b">
          <div className="mx-auto max-w-6xl px-4 md:px-6 py-3">
            <div className="flex items-center justify-between">
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
        </div>
        <div className="flex gap-2 items-center">
          {/* scope tabs */}
          <div className="inline-flex rounded-xl p-1 bg-muted">
            <button
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                scope === "me" ? "bg-background shadow" : "opacity-70"
              }`}
              onClick={() => setScope("me")}
              title="Логи текущего пользователя"
              disabled={!myUserId}
            >
              Мои
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg text-sm transition ${
                scope === "all" ? "bg-background shadow" : "opacity-70"
              }`}
              onClick={() => setScope("all")}
              title="Все логи"
            >
              Все
            </button>
          </div>

          {/* level filter */}
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as Level | "")}
            className="rounded-lg border px-3 py-1.5 text-sm"
            title="Фильтр по уровню"
          >
            <option value="">Все уровни</option>
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
            <option value="debug">debug</option>
          </select>

          {/* search */}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск (event, requestId, текст)..."
            className="rounded-lg border px-3 py-1.5 text-sm w-64"
          />
        </div>

      <Card>
        <CardHeader title="Логи безопасности" />
        <CardContent>
          {loading && <div className="animate-pulse text-sm text-muted-foreground">Загрузка журнала…</div>}
          {error && <p className="text-sm text-red-500">Ошибка: {error}</p>}

          {!loading && !error && logs.length === 0 && (
            <div className="text-sm text-muted-foreground">Записей не найдено.</div>
          )}

          {!loading && !error && logs.length > 0 && (
            <ScrollArea className="h-[560px] rounded-lg ring-1 ring-border">
              <div className="divide-y">
                {groups.map(([day, items]) => (
                  <section key={day}>
                    {/* Заголовок дня */}
                    <div className="sticky top-0 z-10 backdrop-blur bg-background/70 px-4 py-2 text-xs font-medium text-muted-foreground">
                      {day}
                    </div>

                    {/* Список событий */}
                    <ul className="px-2">
                      {items.map((log, idx) => {
                        const i = `${day}-${idx}`;
                        const isOpen = !!expanded[idx];
                        return (
                          <li
                            key={i}
                            className="flex flex-col gap-1 rounded-xl p-2 hover:bg-muted/40 transition"
                          >
                            <div className="flex items-start gap-3">
                              {/* time */}
                              <div className="w-16 shrink-0 text-[11px] text-muted-foreground text-right pt-0.5">
                                {formatTime(log.timestamp)}
                              </div>

                              {/* level badge */}
                              <div
                                className={`px-2 py-0.5 rounded-lg text-[11px] ring-1 ${levelStyle[log.level]}`}
                                title={log.level}
                              >
                                {levelIcon[log.level]} {log.level}
                              </div>

                              {/* event + message */}
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  {log.event && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] ring-1 ring-primary/20">
                                      {log.event}
                                    </span>
                                  )}
                                  {log.module && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-muted text-[11px]">
                                      {log.module}
                                    </span>
                                  )}
                                  {log.requestId && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-muted text-[11px]">
                                      req: {log.requestId.slice(0, 8)}
                                    </span>
                                  )}
                                  {log.userId && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 text-[11px] ring-1 ring-emerald-300">
                                      user: {log.userId}
                                    </span>
                                  )}
                                </div>

                                <div className="text-sm mt-1">
                                  {log.message ?? log.msg ?? "-"}
                                </div>

                                {/* компактные детали */}
                                <div className="text-[11px] text-muted-foreground mt-1 space-x-3">
                                  {log.ip && <span>IP: {log.ip}</span>}
                                  {log.ua && <span className="truncate inline-block max-w-[40ch]" title={log.ua}>UA: {log.ua}</span>}
                                  {typeof log.latencyMs === "number" && <span>t={log.latencyMs}ms</span>}
                                </div>
                              </div>

                              {/* actions */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                                  }}
                                  className="text-xs px-2 py-1 rounded-lg ring-1 ring-border hover:bg-muted"
                                  title="Скопировать JSON"
                                >
                                  Копия
                                </button>
                                <button
                                  onClick={() => setExpanded((s) => ({ ...s, [idx]: !isOpen }))}
                                  className="text-xs px-2 py-1 rounded-lg ring-1 ring-border hover:bg-muted"
                                  title={isOpen ? "Скрыть детали" : "Показать детали"}
                                >
                                  {isOpen ? "Скрыть" : "Детали"}
                                </button>
                              </div>
                            </div>

                            {/* раскрывающаяся панель с JSON */}
                            {isOpen && (
                              <pre className="mt-2 ml-[4.5rem] text-[11px] leading-5 overflow-x-auto bg-muted/50 rounded-lg p-3 ring-1 ring-border">
                                {JSON.stringify(log, null, 2)}
                              </pre>
                            )}
                          </li>
                        );
                      })}
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
