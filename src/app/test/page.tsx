/* components/profile/RecoverSecret.tsx */

"use client";

import { useEffect, useState } from "react";
import { reconstructSecret } from "@/lib/crypto/shamir";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";

interface Share {
  id: string;          // recipientId or share ID
  x: string;           // stringified BigInt
  ciphertext?: number[]; // we don't need ciphertext here
  y?: string;          // stringified BigInt (for reconstruction)
}

export default function RecoverSecret() {
  const [shares, setShares] = useState<Share[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recovered, setRecovered] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1) Загрузить свои доли (y) и prime из API
  const [prime, setPrime] = useState<bigint | null>(null);
  useEffect(() => {
    fetch("/api/me/shares")  // эндпоинт отдаёт { prime, threshold, shares: [{ x, y }] }
      .then((res) => res.json())
      .then((data: { prime: string; shares: { x: string; y: string }[] }) => {
        setPrime(BigInt(data.prime));
        setShares(data.shares.map((s, i) => ({ id: `${s.x}-${i}`, x: s.x, y: s.y })));
      })
      .catch((e) => setError("Не удалось получить доли"));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  };

  // 2) Собрать выбранные доли и восстановить
  const handleRecover = () => {
    if (!prime) return setError("Нет данных о простом модуле");
    const pts: [bigint, bigint][] = shares
      .filter((s) => selected.has(s.id) && s.y)
      .map((s) => [BigInt(s.x), BigInt(s.y!)]);
    try {
      const secretBytes = reconstructSecret(pts, prime);
      const decoder = new TextDecoder();
      setRecovered(decoder.decode(secretBytes));
      setError(null);
    } catch (e: any) {
      setError("Ошибка восстановления: " + e.message);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader title="Восстановление секрета" />
        <CardContent>
          {error && <p className="text-red-500">{error}</p>}
          {!shares.length && !error && <p>Загрузка долей...</p>}

          {shares.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 space-y-4">
              {shares.map((s) => {
                const isSel = selected.has(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`border rounded-lg p-4 cursor-pointer transition 
                      ${isSel ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <p className="font-medium">Доля x = {s.x}</p>
                    <p className="text-sm text-gray-500">y = {s.y}</p>
                    {isSel && (
                      <span className="text-green-600 font-bold">Выбрано</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <Button
            onClick={handleRecover}
            disabled={selected.size < 2} // или порог, если его знаете
          >
            Восстановить секрет
          </Button>

          {recovered !== null && (
            <div className="mt-4 p-4 bg-gray-50 border rounded">
              <p className="font-medium mb-2">Восстановленный секрет:</p>
              <code className="break-all">{recovered}</code>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}