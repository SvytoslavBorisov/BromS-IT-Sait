"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SessionInfo {
  id: string;
  threshold: number;
  createdAt: string;
  activeRecovery: { id: string; status: string } | null;
}

export default function RecoverListPage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/recovery?role=dealer");
        if (!res.ok) throw new Error("Не удалось загрузить сессии");
        const { sessions } = await res.json();
        setSessions(sessions);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p>Загрузка сессий…</p>;
  if (error)   return <p className="text-red-500">Ошибка: {error}</p>;

  console.log(sessions);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Восстановить секрет</h1>
      <ul className="space-y-4">
        {sessions.map((s) => (
          <li
            key={s.sessionId}
            className="p-4 border rounded flex justify-between items-center"
          >
            <div>
              <p><b>Сессия:</b> {s.sessionId}</p>
              <p>
                <b>Порог:</b> {s.threshold} &nbsp;
                {s.activeRecovery
                  ? <span className="text-yellow-600">(восстановление {s.activeRecovery.status})</span>
                  : null
                }
              </p>
              <p className="text-sm text-gray-500">
                создана {new Date(s.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              {s.activeRecovery ? (
                <button
                  disabled
                  className="px-4 py-2 bg-gray-200 text-gray-600 rounded"
                >
                  Восстановление активно
                </button>
              ) : (
                <button
                  onClick={() => router.push(`/profile/recover_secret/${s.sessionId}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Начать восстановление
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}