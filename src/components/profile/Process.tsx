/* components/profile/ProfileProcesses.tsx */

"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";  
import { Button } from "@/components/ui/button";                       
import { useRouter } from "next/navigation";

interface Process {
  id: string;
  name: string;
  status: "pending" | "in-progress" | "completed";
}

export default function ProfileProcesses() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // TODO: заменить на реальный fetch
    (async () => {
      try {
        const demo: Process[] = [
          { id: "1", name: "Сбор долей ABC", status: "pending" },
          { id: "2", name: "Анализ XYZ",    status: "in-progress" },
          { id: "3", name: "Завершённый",   status: "completed" },
        ];
        setProcesses(demo);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDecision = (id: string, decision: "accept" | "decline") => {
    // TODO: POST на сервер
    setProcesses((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "in-progress" } : p
      )
    );
  };

  const handleCreateProject = () => {
    router.push("/profile/create_shares");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Ваши процессы</h1>
        <p className="text-sm text-gray-600">
          Здесь отображаются процессы, в которых вы участвуете
        </p>
      </div>

      <Card>
        <CardHeader title="Список процессов" />
        <CardContent>
          {loading && <p>Загрузка процессов…</p>}
          {error   && <p className="text-red-500">Ошибка: {error}</p>}

          {!loading && !error && (
            <ScrollArea className="h-48">
              <ul className="space-y-3">
                {processes.map((proc) => (
                  <li key={proc.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{proc.name}</p>
                      <p className="text-xs text-gray-500">
                        Статус:{" "}
                        <span
                          className={
                            proc.status === "pending"
                              ? "text-yellow-600"
                              : proc.status === "in-progress"
                              ? "text-blue-600"
                              : "text-green-600"
                          }
                        >
                          {proc.status === "pending"
                            ? "Ожидание решения"
                            : proc.status === "in-progress"
                            ? "В процессе"
                            : "Завершён"}
                        </span>
                      </p>
                    </div>
                    <div className="space-x-2">
                      {proc.status === "pending" ? (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => handleDecision(proc.id, "accept")}
                          >
                            Отправить
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => handleDecision(proc.id, "decline")}
                          >
                            Не отправлять
                          </Button>
                        </>
                      ) : proc.status === "in-progress" ? (
                        <p className="text-sm text-gray-500">Решение отправлено</p>
                      ) : (
                        <p className="text-sm text-green-600">Завершено</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
      <CardHeader title="Действия" />
      <CardContent>
          <div className="space-y-4">
            <p>Создавайте и управляйте своими проектами:</p>
            <Button onClick={handleCreateProject}>Создать проект</Button>
          </div>
      </CardContent>
      </Card>
    </div>
  );
}
