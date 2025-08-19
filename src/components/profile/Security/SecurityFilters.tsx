"use client";

import { User, Users, Search, X } from "lucide-react";
import { Level } from "@/types/logs";
import { useMemo } from "react";

type Scope = "me" | "all";

interface Props {
  scope: Scope;
  setScope: (s: Scope) => void;

  level: Level | "";
  setLevel: (l: Level | "") => void;

  q: string;
  setQ: (s: string) => void;

  myUserId?: string;
}

const LEVELS: Array<{ key: Level | ""; label: string; dot: string; icon: string }> = [
  { key: "",      label: "Все",   dot: "bg-border",          icon: "•"   },
  { key: "error", label: "error", dot: "bg-rose-500",        icon: "⛔"  },
  { key: "warn",  label: "warn",  dot: "bg-amber-500",       icon: "⚠️"  },
  { key: "info",  label: "info",  dot: "bg-cyan-500",        icon: "📘"  },
  { key: "debug", label: "debug", dot: "bg-gray-400",        icon: "🧪"  },
];

export default function SecurityFilters({
  scope, setScope,
  level, setLevel,
  q, setQ,
  myUserId
}: Props) {
  const scopeDisabled = useMemo(() => !myUserId, [myUserId]);

  return (
    <div className="w-full sticky top-14 z-20  border-b">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">

        {/* Segmented: Мои / Все */}
        <div className="inline-flex rounded-xl border bg-muted/50 p-1 shadow-sm">
          <button
            disabled={scopeDisabled}
            onClick={() => setScope("me")}
            className={[
              "group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition",
              scope === "me" ? "bg-shadow shadow ring-1 ring-border" : "opacity-70 hover:opacity-100",
              scopeDisabled ? "opacity-50 cursor-not-allowed" : ""
            ].join(" ")}
            title={scopeDisabled ? "Нет ID пользователя" : "Логи текущего пользователя"}
          >
            <User className="h-4 w-4" />
            <span>Мои</span>
          </button>
          <button
            onClick={() => setScope("all")}
            className={[
              "group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition",
              scope === "all" ? "bg-white shadow ring-1 ring-border" : "opacity-70 hover:opacity-100",
            ].join(" ")}
            title="Все логи"
          >
            <Users className="h-4 w-4" />
            <span>Все</span>
          </button>
        </div>

        {/* Chips: уровни */}
        <div className="flex items-center gap-1.5">
          {LEVELS.map(({ key, label, dot, icon }) => {
            const active = level === key || (key === "" && level === "");
            return (
              <button
                key={label}
                onClick={() => setLevel(key as Level | "")}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition",
                  active ? "bg-white shadow-sm ring-1 ring-border" : "bg- hover:bg-muted/70"
                ].join(" ")}
                title={label === "Все" ? "Все уровни" : `Фильтр: ${label}`}
              >
                <span className={`h-2 w-2 rounded-full ${dot}`} />
                <span className="leading-none">{icon}</span>
                <span className="font-medium">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Поиск */}
        <div className="ml-auto relative flex-1 min-w-[220px] max-w-[420px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск: event, requestId, текст…"
            className="w-full rounded-xl border pl-9 pr-9 py-2 text-sm bg-white outline-none ring-offset-0 focus:ring-2 focus:ring-primary/20 transition"
          />
          {q.length > 0 && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted"
              aria-label="Очистить"
              title="Очистить"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
