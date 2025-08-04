"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SessionInfo {
  id: string;
  threshold: number;
  createdAt: string;
  activeRecovery: { id: string; status: string } | null;
  creatorId:      string;
  recoveryStatus: string;
}


export default function RecoverSecret()  {
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

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/shareSessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Не удалось удалить сессию");
      // Если всё ок, обновляем стейт — убираем удалённую сессию
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (e: any) {
      console.error(e);
      alert("Ошибка при удалении: " + e.message);
    }
  };

  if (loading) return <p>Загрузка сессий…</p>;
  if (error)   return <p className="text-red-500">Ошибка: {error}</p>;

  console.log(sessions);

  return (
    <div className="space-y-6">
      <ul className="space-y-4">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="p-4 border rounded flex justify-between items-center"
          >
            <div>
              <p><b>Сессия:</b> {s.id}</p>
              <p><b>Создатель:</b> {s.creatorId}</p>
              <p><b>Статус:</b> {s.recoveryStatus}</p>
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
            <div className="flex flex-col space-y-2">
              {s.recoveryStatus === "PENDING" ? (
                <button
                  onClick={() => router.push(`/profile/recover_secret/${s.id}`)}
                  className="px-4 py-2 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                >
                  Восстановление активно
                </button>
              ) : (
                <button
                  onClick={() => router.push(`/profile/recover_secret/${s.id}`)}
                  className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500"
                >
                  Начать восстановление
                </button>
              )}

              <button
                onClick={() => handleDelete(s.id)}
                className="px-4 py-2 bg-red-400 text-white rounded hover:bg-red-500"
              >
                Удалить разделение
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}