/* components/profile/Security.tsx */

"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogEntry {
  timestamp: string;
  level: string;
  event: string;
  message?: string;
}

export default function Security() {
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Безопасность</h1>
      <p className="text-sm text-gray-600">Журнал безопасности и аудита.</p>

      <Card>
        <CardHeader title="Логи безопасности" />
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
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
