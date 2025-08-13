// components/CreateShares.tsx
"use client";

import { useEffect, useState } from "react";
import { createCustomShares, createAsymmetricShares, FileType, Participant } from "@/lib/crypto/shares";
import ParticipantsList from "@/components/profile/ParticipantsList";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";

export default function CreateShares() {
  const [secret, setSecret] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [threshold, setThreshold] = useState(2);
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("Разделение");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [type, setType] = useState<FileType>("CUSTOM");

  useEffect(() => {
    fetch("/api/participants", { cache: "no-store" })
      .then((r) => r.json())
      .then(setParticipants)
      .catch(console.error);
  }, []);

  const toggle = (id: string) => {
    setSelected((s) => {
      const copy = new Set(s);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      if (threshold > copy.size) setThreshold(copy.size);
      return copy;
    });
  };

  const handleCreate = async () => {
    if (type === "CUSTOM" && !secret) return;
    if (selected.size < threshold) return;

    let data;
    if (type === "CUSTOM") {
      data = await createCustomShares(
        secret,
        participants,
        Array.from(selected),
        threshold,
        comment,
        expiresAt
      );
    } else {
      data = await createAsymmetricShares(
        participants,
        Array.from(selected),
        threshold,
        comment,
        expiresAt
      );
    }

    await fetch("/api/shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, title, type }),
    });

    alert("Доли созданы и отправлены!");
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border rounded"
                rows={1}
              />
            </div>

            {type === "CUSTOM" && (
              <div>
                <label className="font-medium block mb-1">Секрет</label>
                <textarea
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="w-full p-2 border rounded"
                  rows={4}
                />
              </div>
            )}

            <div>
              <label className="font-medium block mb-1">Тип</label>
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
              <label className="font-medium block mb-1">Комментарий</label>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-2 border rounded"
              />
            </div>

            <div>
              <label className="font-medium block mb-1">Время истечения</label>
              <input
                type="datetime-local"
                value={expiresAt ?? ""}
                onChange={(e) => setExpiresAt(e.target.value || null)}
                className="w-full p-2 border rounded"
              />
            </div>

            <ParticipantsList
              participants={participants}
              selected={selected}
              onToggle={toggle}
            />

            <div>
              <label className="font-medium block mb-1">Порог восстановления</label>
              <input
                type="number"
                min={1}
                max={selected.size}
                value={threshold}
                onChange={(e) => setThreshold(Math.min(Number(e.target.value), selected.size))}
                className="w-24 p-1 border rounded"
              />
            </div>

            <Button onClick={handleCreate} disabled={type === "CUSTOM" && !secret}>
              Генерировать и отправить
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
