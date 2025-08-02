"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";

interface Share {
  x: string;
  ciphertext: number[];
}

export default function MyShares() {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/shares")
      .then((res) => {
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        return res.json();
      })
      .then((data: Share[]) => setShares(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Мои доли</h1>
      <p className="text-sm text-gray-600">
        Здесь отображаются ваши сохранённые доли секрета.
      </p>

      <Card>
        <CardHeader title="Список долей" />
        <CardContent>
          {loading && <p>Загрузка долей...</p>}
          {error && <p className="text-red-500">Ошибка: {error}</p>}

          {!loading && !error && (
            <ScrollArea className="h-64">
              {shares.length > 0 ? (
                <ul className="list-disc list-inside">
                  {shares.map(({ x, ciphertext }, idx) => (
                    <li key={`${x}-${idx}`} className="mb-1 text-xs">
                      x = <span className="font-mono">{x}</span>,&nbsp;
                      шифротекст:{" "}
                      <code>
                        [{ciphertext.slice(0, 10).join(",")}…]
                      </code>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">
                  Долей пока нет или вы не залогинены.
                </p>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
