"use client";

import { useState } from "react";
import { LogEntry } from "@/types/logs";
import { levelStyle, levelIcon, formatTime } from "./utils";

interface LogItemProps {
  day: string;
  idx: number;
  log: LogEntry;
}

export default function LogItem({ day, idx, log }: LogItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li className="flex flex-col gap-1 rounded-xl p-2 hover:bg-muted/40 transition">
      <div className="flex items-start gap-3">
        {/* time */}
        <div className="w-16 shrink-0 text-[11px] text-muted-foreground text-right pt-0.5">
          {formatTime(log.timestamp)}
        </div>

        {/* level */}
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

          <div className="text-[11px] text-muted-foreground mt-1 space-x-3">
            {log.ip && <span>IP: {log.ip}</span>}
            {log.ua && (
              <span
                className="truncate inline-block max-w-[40ch]"
                title={log.ua}
              >
                UA: {log.ua}
              </span>
            )}
            {typeof log.latencyMs === "number" && (
              <span>t={log.latencyMs}ms</span>
            )}
          </div>
        </div>

        {/* actions */}
        <div className="flex gap-2">
          <button
            onClick={() =>
              navigator.clipboard.writeText(JSON.stringify(log, null, 2))
            }
            className="text-xs px-2 py-1 rounded-lg ring-1 ring-border hover:bg-muted"
            title="Скопировать JSON"
          >
            Копия
          </button>
          <button
            onClick={() => setIsOpen((s) => !s)}
            className="text-xs px-2 py-1 rounded-lg ring-1 ring-border hover:bg-muted"
            title={isOpen ? "Скрыть детали" : "Показать детали"}
          >
            {isOpen ? "Скрыть" : "Детали"}
          </button>
        </div>
      </div>

      {/* раскрывающаяся панель */}
      {isOpen && (
        <pre className="mt-2 ml-[4.5rem] text-[11px] leading-5 overflow-x-auto bg-muted/50 rounded-lg p-3 ring-1 ring-border">
          {JSON.stringify(log, null, 2)}
        </pre>
      )}
    </li>
  );
}
