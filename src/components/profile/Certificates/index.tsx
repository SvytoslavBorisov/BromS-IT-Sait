"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/cards";
import CertificateCard from "./CertificateCard";
import type { Certification, ParsedCert } from "./types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { parsePem } from "./cert-utils";

export default function CertificatesList() {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [expanded, setExpanded] = useState<Record<string, ParsedCert | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const r = await fetch("/api/me/certifications");
    const data = await r.json();
    setCerts(data);
  }

  function handleToggle(cert: Certification, parsed: ParsedCert | null) {
    setExpanded((prev) => ({ ...prev, [cert.id]: parsed }));
  }

  function openFileDialog() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const pem = await fileToPem(file);

      // Пытаемся извлечь CN для красивого заголовка
      let title = file.name.replace(/\.(cer|crt|pem|der)$/i, "");
      try {
        const info = await parsePem(pem);
        const cn = info.subject.split(", ").find((p) => /CN=/.test(p));
        if (cn) title = cn.replace(/^CN=/, "");
      } catch {
        // парсинг не обязателен для сохранения
      }

      const res = await fetch("/api/me/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, pem }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Upload failed (${res.status})`);
      }

      await refresh();
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      // сброс input, чтобы можно было выбрать тот же файл повторно
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-9 w-9 rounded-2xl border flex items-center justify-center shadow-sm">
                <span className="text-sm font-semibold">SSS</span>
              </div>
              <div className="truncate">
                <h1 className="text-lg md:text-xl font-semibold leading-6 truncate">Сертификаты</h1>
                <p className="text-muted-foreground text-xs md:text-sm">Ваши сертификаты</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".cer,.crt,.pem,.der,application/x-x509-ca-cert,application/pkix-cert"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button onClick={openFileDialog} className="mt-2 rounded-2xl w-fit">
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>Загрузить сертификат</span>
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 space-y-4">
        {certs.map((c) => (
          <Card key={c.id} className="shadow-md">
            <CertificateCard cert={c} expanded={expanded[c.id]} onToggle={handleToggle} />
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Преобразует выбранный файл в PEM (если уже PEM — вернёт как есть) */
async function fileToPem(file: File): Promise<string> {
  const textMaybe = await tryReadText(file);

  if (textMaybe && /-----BEGIN CERTIFICATE-----/.test(textMaybe)) {
    // Нормализуем переносы строк
    const b64 = textMaybe
      .replace(/-----BEGIN CERTIFICATE-----/g, "")
      .replace(/-----END CERTIFICATE-----/g, "")
      .replace(/[\r\n\s]+/g, "");
    return wrapPem(b64);
  }

  // Иначе читаем как бинарь и конвертим DER -> PEM
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const b64 = base64FromBytes(bytes);
  return wrapPem(b64);
}

function wrapPem(b64: string): string {
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----\n`;
}

async function tryReadText(file: File): Promise<string | null> {
  try {
    // пробуем как текст — если бинарь, будет мусор, но мы это отсеем
    const t = await file.text();
    // heuristic: если слишком много NUL/непеч символов, считаем бинарём
    const nonPrintable = (t.match(/[^\x09\x0A\x0D\x20-\x7E]/g) || []).length;
    if (nonPrintable > t.length * 0.1) return null;
    return t;
  } catch {
    return null;
  }
}

function base64FromBytes(u8: Uint8Array): string {
  // Без внешних зависимостей
  let binary = "";
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
}
