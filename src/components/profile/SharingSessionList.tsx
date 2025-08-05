"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SessionInfo {
  id: string;
  dealerId: string;
  p: string;
  q: string;
  g: string;
  commitments: string[];
  threshold: number;
  createdAt: string;
  status: string;
  shares: { x: string, userId: string, ciphertext: string } | null;
  recoveries:      { id: string } | null;
}


export default function SharingSessionList()  {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/shareSessions");
        console.log('res = ', res);
        if (!res.ok) throw new Error("Не удалось загрузить сессии");
        const sessions = await res.json();
        console.log('res = ', sessions);
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
              <p><b>Создатель:</b> {s.dealerId}</p>
              <p><b>p:</b> {s.p}</p>
              <p><b>q:</b> {s.q}</p>
              <p><b>g:</b> {s.g}</p>
              <p><b>commitments:</b> {s.commitments}</p>
              
              <p>
                <b>Порог:</b> {s.threshold} &nbsp;
                {s.status
                  ? <span className="text-yellow-600">(Статус {s.status})</span>
                  : null
                }
              </p>
              <p className="text-sm text-gray-500">
                создана {new Date(s.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => router.push(`/profile/recover_secret/${s.id}`)}
                className="px-4 py-2 bg-blue-400 text-white rounded hover:bg-blue-500"
              >
                Восстановить секрет
              </button>
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