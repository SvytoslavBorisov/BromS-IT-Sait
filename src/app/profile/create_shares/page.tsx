// components/CreateShares.tsx
"use client";

import { useEffect, useState } from "react";
import { shareSecretVSS } from "@/lib/crypto/shamir";
import { encryptWithPubkey } from "@/lib/crypto/keys";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { generateGostKeyPair } from "@/lib/crypto/gost3410"

interface Participant {
  id: string;
  name: string;
  publicKey: JsonWebKey;
}
 
type FileType = 'CUSTOM' | 'ASYMMETRIC';

export default function CreateShares() {
  const [secret, setSecret] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [threshold, setThreshold] = useState(2);
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("Разделение");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [type, setType] = useState<FileType>('CUSTOM');
  
  useEffect(() => {
    fetch("/api/participants", { cache: "no-store" })
      .then((r) => r.json())
      .then(setParticipants)
      .catch(console.error);
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

    if (type === 'CUSTOM') {
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
      await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p: p.toString(),
          q: q.toString(),
          g: g.toString(),
          threshold,
          commitments: commitments.map((c) => c.toString()),
          type: type,
          title: title,
          shares: payload,
        }),
      });
    }
    else {
      const {
        privateKey: privKey,
        publicKey: pubKey,   // переименовали
        p: p_as_key,
        a: a_as_key,
        b: b_as_key,
        m: m_as_key,
        q: q_as_key,
        xp: xp_as_key,
        yp: yp_as_key,
        Q: Q_as_key,
      } = generateGostKeyPair();

      console.log('asdad', privKey, pubKey);

      const { p, q, g, commitments, sharesList } = shareSecretVSS(
        new TextEncoder().encode(privKey),
        threshold,
        selected.size
      );

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

      await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p: p.toString(),
          q: q.toString(),
          g: g.toString(),
          p_as_key,
          a_as_key,
          b_as_key,
          m_as_key,
          q_as_key,
          xp_as_key,
          yp_as_key,
          Q_as_key,
          threshold,
          title,
          commitments: commitments.map((c) => c.toString()),
          type: type,
          publicKey: pubKey,
          shares: payload,
        }),
      });
    }
    // 3) Отправляем на сервер полный VSS-пакет:


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
              <label className="font-medium block mb-1">Название разделения</label>
              <textarea
                placeholder="Название разделения"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border rounded"
                rows={1}
              />
            </div>

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
              <label className="font-medium block mb-1">Выберите для чего вам разделения</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FileType)}
                className="border rounded px-2 py-1"
              >
                <option value="CUSTOM">Пользовательский</option>
                <option value="ASYMMETRIC">Асимметричный</option>
              </select>
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
