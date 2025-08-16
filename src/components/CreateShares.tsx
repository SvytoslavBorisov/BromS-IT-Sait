// components/CreateShares.tsx
"use client";

import { useEffect, useState } from "react";
import { createCustomShares, createAsymmetricShares, FileType, Participant } from "@/lib/crypto/shares";
import ParticipantsList from "@/components/profile/ParticipantsList";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { Session } from "inspector/promises";
import { useSession } from "next-auth/react";

export default function CreateShares() {
  const [secret, setSecret] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [threshold, setThreshold] = useState(2);
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("Разделение");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [type, setType] = useState<FileType>("CUSTOM");
  const [fileContent, setFileContent] = useState<string>('');

  const { data: session, status } = useSession();

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

  function downloadAsFile(data: string | Uint8Array, fileName: string, mimeType: string) {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  useEffect(() => {
    fetch('broms.cer') // Если файл в public/, можно напрямую указать путь
      .then((response) => response.arrayBuffer())
      .then((data) => {
        console.log('CER file loaded:', data);
        // Декодируем как текст (если PEM) или работаем с бинарными данными
        const text = new TextDecoder().decode(data);
        console.log('As text:', text);
        setFileContent(text)
      });
  }, []);

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

      await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, title, type }),
      });

    } else {
      const data1 = await createAsymmetricShares(
        participants,
        Array.from(selected),
        threshold,
        comment,
        expiresAt,
        fileContent,
        'f1f1205a8f0bab12aff2a5ed08296c9894686aa62ec0e131c20cafa71c59b9f1',
        'sv_borisov03@mail.ru',
        'SvyTo',
        new Date().toISOString(),
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        '3'
      );

      console.log(data1);
      // console.log(fileContent)
      // const res = await fetch("/api/create/sertification", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     email: 'sv@mail.ru',
      //     cn: 'Slava2',
      //     issuerCertPemOrDer: fileContent,
      //     issuerPrivHex: 'f1f1205a8f0bab12aff2a5ed08296c9894686aa62ec0e131c20cafa71c59b9f1',
      //     subjectPrivHex: '6c13eb9a952e28ec3b1ac7a668b89e37f881a865e39a3b224aa95de8e61db90e',
      //     notBefore: new Date().toISOString(),
      //     notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // +1 год
      //   }),
      // });

      // if (!res.ok) {
      //   throw new Error(`Ошибка ${res.status}: ${await res.text()}`);
      // }

      // const cerContent = await res.json(); // Извлекаем base64-строку
      console.log(data1.pem)
      downloadAsFile(data1.pem, title + '.cer', 'application/x-x509-ca-cert');
      
      await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data1, title, type }),
      });

    }

    alert("Доли созданы и отправлены!");
    setSecret("");
    setSelected(new Set());
    setThreshold(1);
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
