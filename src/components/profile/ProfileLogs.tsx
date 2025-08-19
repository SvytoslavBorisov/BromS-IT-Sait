"use client";

import { useEffect, useState } from "react";
import { humanizeLog, type LogEntry } from "@/lib/log-humanizer";

export default function ProfileLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    setLoading(true);
    fetch("/api/logs?scope=me&limit=300")
      .then((r) => {
        if (!r.ok) throw new Error(`Ошибка ${r.status}`);
        return r.json();
      })
      .then((data: LogEntry[]) => {
        if (!aborted) setLogs(data);
      })
      .catch((e) => !aborted && setErr(e.message))
      .finally(() => !aborted && setLoading(false));
    return () => {
      aborted = true;
    };
  }, []);

  return (
    <aside className="col-span-12 lg:col-span-4">
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-base font-semibold">Мои действия</h2>
          <p className="text-xs text-muted-foreground">последние 300 записей</p>
        </div>

        <div className="p-3">
          {loading && <div className="text-sm text-muted-foreground">Загрузка…</div>}
          {err && <div className="text-sm text-rose-600">Ошибка: {err}</div>}

          {!loading && !err && (
            <div className="max-h-[750px] overflow-auto pr-1">
              <ul className="space-y-2">
                {logs.map((log, i) => {
                  const h = humanizeLog(log as any);
                  return (
                    <li
                      key={i}
                      className="rounded-xl border px-3 py-2 transition hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground w-[90px]">
                          {new Date(log.timestamp).toLocaleTimeString("ru-RU")}
                        </span>
                        <span className="text-base">{h.icon ?? "ℹ️"}</span>
                        <span className="text-sm font-medium">{h.title}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
