"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { ScrollArea } from "@/components/ui/scroll-area";

type Maybe<T> = T | undefined | null;

interface LogEntry {
  userId: string;
  timestamp: string;
  level: string;
  event: string;
  message?: string;
}

type Me = {
  name?: string;
  surname?: string;
  email?: string;
  image?: string;
  company?: {
    id: string;
    title: string;
  };
  department?: {
    id: string;
    title: string;
  };
  position?: {
    id: string;
    title: string;
  };
  // другие поля, которые реально возвращает /api/me
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
    <a href={href} className="text-blue-600 hover:underline break-all">{value}</a>
  ) : (
    <span className="text-gray-900 break-words">{value}</span>
  );
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
      <div className="w-36 shrink-0 text-gray-500">{label}</div>
      {content}
    </div>
  );
}

export default function ProfileDetails() {
  const { data: session, status } = useSession();

  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/logs")
      .then((res) => {
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        return res.json();
      })
      .then((data: LogEntry[]) => {
        setLogs(data);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);


  useEffect(() => {
    if (status !== "authenticated") return;
    const ctrl = new AbortController();

    (async () => {
      try {
        setMeLoading(true);
        setMeError(null);

        const res = await fetch("/api/me", {
          method: "GET",
          credentials: "include", // куки next-auth
          headers: {
            Accept: "application/json",
            ...(session as any)?.accessToken
              ? { Authorization: `Bearer ${(session as any).accessToken}` }
              : {},
          },
          signal: ctrl.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
        }

        const data: Me = await res.json();
        console.log(data)
        setMe(data);
      } catch (e: any) {
        if (e?.name !== "AbortError") setMeError(e?.message ?? "Не удалось загрузить профиль");
      } finally {
        setMeLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [status, session]);

  if (status === "loading") return <p>Загрузка…</p>;

  // объединяем session.user и данные из API
  const user: any = useMemo(() => ({ ...(session?.user ?? {}), ...(me ?? {}) }), [session?.user, me]);
  console.log(me, user)
  const name = user.name ?? "";
  const surname = user.surname ?? "";
  const fullName = [name, surname].filter(Boolean).join(" ") || "Без имени";

  const bannerUrl: string | undefined = user.banner || user.cover || undefined;

  return (
    <section className="w-full mx-auto">
      <div className="relative overflow-hidden bg-white shadow ring-1 ring-black/5">
        {/* Баннер */}
        <div className="relative h-40 sm:h-56 bg-gradient-to-r from-sky-500 to-blue-600">
          {bannerUrl && (
            <Image src={bannerUrl} alt="Banner" fill className="object-cover opacity-90" />
          )}

          {/* Аватар */}
          <div className="absolute -bottom-14 left-6 z-10">
            <div className="h-28 w-28 rounded-full ring-4 ring-white overflow-hidden bg-gray-100 flex items-center justify-center text-2xl font-semibold text-gray-700">
              {user.image ? (
                <Image src={user.image} alt={fullName} width={112} height={112} className="h-full w-full object-cover" />
              ) : (
                <span>{initials(name, surname)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Контент */}
        <div className="px-6 pt-16 pb-6 sm:px-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{fullName}</h1>
          <p className="mt-1 text-gray-500">
            {user.username ? `@${user.username}` : user.email || "—"}
          </p>

          {meLoading && <p className="mt-4 text-sm text-gray-500">Обновляем данные профиля…</p>}
          {meError && <p className="mt-4 text-sm text-red-600">Ошибка: {meError}</p>}

          <div className="mt-6 grid grid-cols-1 gap-4">
            <InfoRow label="E‑mail" value={user!.email} href={user!.email ? `mailto:${user!.email}` : undefined} />
            <InfoRow label="Компания" value={me?.company?.title} />
            <InfoRow label="Отдел" value={me?.department?.title} />
            <InfoRow label="Должность" value={me?.position?.title} />
            <InfoRow label="Телефон" value={user.phone} href={user.phone ? `tel:${user.phone}` : undefined} />
            <InfoRow label="Локация" value={user.location} />
          </div>
        </div>

        <div className="px-6 pt-16 pb-6 sm:px-8">
          <h2 className=" font-semibold text-gray-900">Последняя активность</h2>
          <CardContent>
              {loading && <p>Загрузка...</p>}
              {error && <p className="text-red-500">Ошибка: {error}</p>}

              {!loading && !error && (
                <ScrollArea className="h-64">
                  <table className="w-full text-left table-auto">
                    <thead>
                      <tr>
                        <th className="px-2 py-1">Дата/Время</th>
                        <th className="px-2 py-1">Уровень</th>
                        <th className="px-2 py-1">Событие</th>
                        <th className="px-2 py-1">Сообщение</th>
                      </tr>
                    </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      log.userId === session?.user.id && (
                        <tr key={idx} className="odd:bg-gray-50">
                          <td className="px-2 py-1 align-top text-xs">
                            {new Date(log.timestamp).toLocaleString("ru-RU")}
                          </td>
                          <td className="px-2 py-1 align-top text-xs font-medium">
                            {log.level}
                          </td>
                          <td className="px-2 py-1 align-top text-xs">{log.event}</td>
                          <td className="px-2 py-1 align-top text-xs">
                            {log.message || "-"}
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
        </div>

        <div className="px-6 pt-16 pb-6 sm:px-8">
          <h2 className=" font-semibold text-gray-900">Запросы к</h2>
          <CardContent>
              {loading && <p>Загрузка...</p>}
              {error && <p className="text-red-500">Ошибка: {error}</p>}

              {!loading && !error && (
                <ScrollArea className="h-64">
                  <table className="w-full text-left table-auto">
                    <thead>
                      <tr>
                        <th className="px-2 py-1">Дата/Время</th>
                        <th className="px-2 py-1">Уровень</th>
                        <th className="px-2 py-1">Событие</th>
                        <th className="px-2 py-1">Сообщение</th>
                      </tr>
                    </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      log.userId === session?.user.id && (
                        <tr key={idx} className="odd:bg-gray-50">
                          <td className="px-2 py-1 align-top text-xs">
                            {new Date(log.timestamp).toLocaleString("ru-RU")}
                          </td>
                          <td className="px-2 py-1 align-top text-xs font-medium">
                            {log.level}
                          </td>
                          <td className="px-2 py-1 align-top text-xs">{log.event}</td>
                          <td className="px-2 py-1 align-top text-xs">
                            {log.message || "-"}
                          </td>
                        </tr>
                      )
                    ))}
                  </tbody>
                  </table>
                </ScrollArea>
              )}
            </CardContent>
        </div>
      </div>
    </section>
  );
}
