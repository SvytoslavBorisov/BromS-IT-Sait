/* components/profile/ProfileDetails.tsx */
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { humanizeLog, type LogEntry } from "@/lib/log-humanizer";

type Maybe<T> = T | undefined | null;

type Me = {
  name?: string;
  surname?: string;
  email?: string;
  image?: string;
  banner?: string;
  cover?: string;
  phone?: string;
  location?: string;
  company?: { id: string; title: string };
  department?: { id: string; title: string };
  position?: { id: string; title: string };
};

function initials(name?: string, surname?: string) {
  const a = (name?.[0] ?? "").toUpperCase();
  const b = (surname?.[0] ?? "").toUpperCase();
  return (a + b) || "U";
}

function InfoRow({
  label,
  value,
  href,
}: {
  label: string;
  value: Maybe<string>;
  href?: string;
}) {
  if (!value) return null;
  const content = href ? (
    <a href={href} className="text-blue-600 hover:underline break-all">
      {value}
    </a>
  ) : (
    <span className="text-gray-900 break-words">{value}</span>
  );
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-1.5">
      <div className="w-36 shrink-0 text-gray-500">{label}</div>
      {content}
    </div>
  );
}

const levelTone: Record<LogEntry["level"], string> = {
  error: "bg-rose-50 text-rose-900 ring-rose-200",
  warn: "bg-amber-50 text-amber-900 ring-amber-200",
  info: "bg-cyan-50 text-cyan-900 ring-cyan-200",
  debug: "bg-gray-100 text-gray-700 ring-gray-200",
};

const fmt = (ts: string) =>
  new Date(ts).toLocaleString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

export default function ProfileDetails() {
  const { data: session, status } = useSession();

  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Загрузка профиля
  useEffect(() => {
    if (status !== "authenticated") return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setMeLoading(true);
        setMeError(null);
        const res = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Me = await res.json();
        setMe(data);
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setMeError(e?.message ?? "Не удалось загрузить профиль");
      } finally {
        setMeLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [status]);

  // Загрузка логов только для текущего пользователя
  useEffect(() => {
    setLoadingLogs(true);
    fetch("/api/logs?scope=me&limit=300")
      .then((r) => {
        if (!r.ok) throw new Error(`Ошибка ${r.status}`);
        return r.json();
      })
      .then((data: LogEntry[]) => setLogs(data))
      .catch((e) => setLogsError(e.message))
      .finally(() => setLoadingLogs(false));
  }, []);

  if (status === "loading") return <p className="px-6 py-6">Загрузка…</p>;

  // объединяем session.user и данные из API
  const user: any = useMemo(
    () => ({ ...(session?.user ?? {}), ...(me ?? {}) }),
    [session?.user, me]
  );

  const name = user.name ?? "";
  const surname = user.surname ?? "";
  const fullName = [name, surname].filter(Boolean).join(" ") || "Без имени";
  const bannerUrl: string | undefined = user.banner || user.cover || undefined;

  return (
    <section className="w-full">
      <div className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-12 gap-6">
        {/* ЛЕВАЯ: ПРОФИЛЬ (8/12) */}
        <div className="col-span-12 lg:col-span-8">
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            {/* Баннер */}
            <div className="relative h-40 sm:h-56 bg-gradient-to-r from-sky-500 to-blue-600">
              {bannerUrl && (
                <Image
                  src={bannerUrl}
                  alt="Banner"
                  fill
                  className="object-cover opacity-90"
                />
              )}
              {/* Аватар */}
              <div className="absolute -bottom-14 left-6 z-10">
                <div className="h-28 w-28 rounded-full ring-4 ring-white overflow-hidden bg-gray-100 flex items-center justify-center text-2xl font-semibold text-gray-700">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={fullName}
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{initials(name, surname)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Контент профиля */}
            <div className="px-6 pt-16 pb-6 sm:px-8">
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                {fullName}
              </h1>
              <p className="mt-1 text-gray-500">
                {user.username ? `@${user.username}` : user.email || "—"}
              </p>

              {meLoading && (
                <p className="mt-4 text-sm text-gray-500">
                  Обновляем данные профиля…
                </p>
              )}
              {meError && (
                <p className="mt-4 text-sm text-red-600">Ошибка: {meError}</p>
              )}

              <div className="mt-6 grid grid-cols-1 gap-2">
                <InfoRow
                  label="E‑mail"
                  value={user.email}
                  href={user.email ? `mailto:${user.email}` : undefined}
                />
                <InfoRow label="Компания" value={me?.company?.title} />
                <InfoRow label="Отдел" value={me?.department?.title} />
                <InfoRow label="Должность" value={me?.position?.title} />
                <InfoRow
                  label="Телефон"
                  value={user.phone}
                  href={user.phone ? `tel:${user.phone}` : undefined}
                />
                <InfoRow label="Локация" value={user.location} />
              </div>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ: МОИ ЛОГИ (4/12) */}
        <aside className="col-span-12 lg:col-span-4">
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="text-base font-semibold">Мои действия</h2>
              <p className="text-xs text-muted-foreground">
                последние 300 записей
              </p>
            </div>

            <div className="p-3">
              {loadingLogs && (
                <div className="text-sm text-muted-foreground">Загрузка…</div>
              )}
              {logsError && (
                <div className="text-sm text-rose-600">Ошибка: {logsError}</div>
              )}

              {!loadingLogs && !logsError && (
                <div className="max-h-[640px] overflow-auto pr-1">
                  <ul className="space-y-2">
                    {logs.map((log, i) => {
                      const h = humanizeLog(log as any); // если типы не совпали, временно as any
                      return (
                        <li key={i} className="rounded-xl border px-3 py-2 transition hover:bg-muted/40">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground w-[90px]">
                              {new Date(log.timestamp).toLocaleTimeString("ru-RU")}
                            </span>
                            <span className="text-base">{h.icon ?? "ℹ️"}</span>
                            <span className="text-sm font-medium">{h.title}</span>
                            {h.meta?.length ? (
                              <span className="ml-auto text-[11px] text-muted-foreground">
                                {h.meta.join(" · ")}
                              </span>
                            ) : null}
                          </div>
                          {h.subtitle && (
                            <div className="mt-0.5 text-[13px] text-muted-foreground leading-5">
                              {h.subtitle}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
