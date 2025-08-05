// components/CreateShares.tsx
"use client";

import { useEffect, useState } from "react";
import { shareSecretVSS } from "@/lib/crypto/shamir";
import { encryptWithPubkey } from "@/lib/crypto/keys";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";

interface Participant {
  id: string;
  name: string;
  publicKey: JsonWebKey;
}

export default function CreateShares() {
  const [secret, setSecret] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [threshold, setThreshold] = useState(2);
  const [comment, setComment] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/participants", { cache: "no-store" })
      .then((r) => r.json())
      .then(setParticipants)
      .catch(console.error);

      const res = fetch('http://localhost:3000/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: 'test-message',
          signature: '67622fb1399b3dc67c94e8e8cceb35ba2c89cd8b2bf9b5ef87521f92464b4fca'
        })
      });
      console.log('asdasd', res);

  }, []);

  const toggle = (id: string) => {
    setSelected((s) => {
      const copy = new Set(s);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
      }
      // Adjust threshold if necessary
      if (threshold > copy.size) {
        setThreshold(copy.size);
      }
      return copy;
    });
  };

  const handleCreate = async () => {
    if (!secret || selected.size < threshold) return;

    // 1) Генерируем VSS-доли с коммитментами
    const { p, q, g, commitments, sharesList } = shareSecretVSS(
      new TextEncoder().encode(secret),
      threshold,
      selected.size
    );

    // 2) Шифруем каждую y-долю публичным ключом получателя
    const payload = await Promise.all(
      Array.from(selected).map(async (recipientId, idx) => {
        const x = sharesList[idx][0].toString();
        const y = sharesList[idx][1].toString();
        const part = participants.find((p) => p.id === recipientId)!;
        const ct = await encryptWithPubkey(y, part.publicKey);

        return {
          recipientId,
          x,
          ciphertext: Array.from(ct),
          status: "ACTIVE",
          comment,
          encryptionAlgorithm: "RSA-OAEP-SHA256",
          expiresAt, // ISO string or null
        };
      })
    );

    // 3) Отправляем на сервер полный VSS-пакет:
    await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p: p.toString(),
        q: q.toString(),
        g: g.toString(),
        threshold,
        commitments: commitments.map((c) => c.toString()),
        shares: payload,
      }),
    });

    alert("Доли созданы и разосланы участникам!");
    // Сброс формы
    setSecret("");
    setSelected(new Set());
    setThreshold(2);
    setComment("");
    setExpiresAt(null);
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader title="Создать VSS-доли секрета" />
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="font-medium block mb-1">Секрет</label>
              <textarea
                placeholder="Введите секрет"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full p-2 border rounded"
                rows={4}
              />
            </div>

            <div>
              <label className="font-medium block mb-1">
                Комментарий к долям
              </label>
              <input
                type="text"
                placeholder="Комментарий"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="font-medium block mb-1">
                Время истечения долей
              </label>
              <input
                type="datetime-local"
                value={expiresAt ?? ""}
                onChange={(e) =>
                  setExpiresAt(e.target.value || null)
                }
                className="w-full p-2 border rounded"
              />
              <p className="text-sm text-gray-500">
                Оставьте пустым для бесконечного срока.
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-medium">Участники (×{selected.size}):</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {participants.map((p) => {
                  const isSel = selected.has(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        isSel
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{p.name}</span>
                        {isSel && (
                          <span className="text-blue-600 font-bold">✓</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">ID: {p.id}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <label className="font-medium block mb-1">
                Порог восстановления
              </label>
              <input
                type="number"
                min={1}
                max={selected.size}
                value={threshold}
                onChange={(e) =>
                  setThreshold(Math.min(Number(e.target.value), selected.size))
                }
                className="w-24 p-1 border rounded"
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={!secret || selected.size < threshold}
              className="mt-4"
            >
              Генерировать и отправить
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
