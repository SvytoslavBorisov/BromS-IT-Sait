"use client";

import { useEffect, useState } from "react";
import { shareSecret }           from "@/lib/crypto/shamir";
import { encryptWithPubkey }     from "@/lib/crypto/keys";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button }                     from "@/components/ui/button";


interface Participant {
  id: string;
  name: string;
  publicKey: JsonWebKey;
}

export default function CreateShares() {
  const [secret, setSecret]             = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [threshold, setThreshold]       = useState(2);

  useEffect(() => {
    fetch("/api/participants")
      .then(r => r.json())
      .then(setParticipants)
      .catch(console.error);
  }, []);

  const toggle = (id: string) => {
    setSelected(s => {
      const copy = new Set(s);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  };

  const handleCreate = async () => {
    if (!secret || selected.size < threshold) return;
    // 1) генерируем точки
    const { prime, points } = shareSecret(
      new TextEncoder().encode(secret),
      threshold,
      Array.from(selected).length
    );
    
    // 2) шифруем и собираем payload
    const payload = await Promise.all(
      points.map(async ([x, y], idx) => {
        const recipientId = Array.from(selected)[idx];
        const { publicKey } = participants.find(p => p.id === recipientId)!;
        const shareHex = y.toString(16);
        const ct = await encryptWithPubkey(shareHex, publicKey);
        
        return {
          recipientId,
          x: x.toString(),
          ciphertext: Array.from(ct),
        };
      })
    );
    // 3) POST на сервер
    await fetch("/api/shares", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        prime:     prime.toString(),
        threshold: threshold,
        shares:    payload,
      }),
    });

    alert("Доли созданы и разосланы участникам!");
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader title="Создать доли секрета" />
        <CardContent>
          <textarea
            placeholder="Введите секрет"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            className="space-y-4 w-full p-2 border rounded"
          />

          <div className="space-y-1">
            <p className="font-medium">Выберите участников:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {participants.map((p) => {
                const isSelected = selected.has(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`
                      border rounded-lg p-4 cursor-pointer transition
                      ${isSelected ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.name}</span>
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-blue-600"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">ID: {p.id}</p>
                  </div>
                );
              })}
            </div>
          </div>


          <div>
            <p className="font-medium">Порог восстановления:</p>
            <input
              type="number"
              min={1}
              max={selected.size}
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-24 p-1 border rounded"
            />
          </div>

          <Button onClick={handleCreate} disabled={!secret || selected.size < threshold}>
            Генерировать и отправить доли
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
