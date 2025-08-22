"use client";

import React, { useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useSignatures } from "./hooks";
import { SignList } from "./SignList";
import type { VerifyResult, SignatureRow } from "./types";

export default function SignsPage() {
  const { status } = useSession();

  const { rows, loading, refresh, setRows } = useSignatures(status === "authenticated");
  const [q, setQ] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [loadBusy, setLoadBusy] = useState(false);

  // Скрытый input для выбора файла
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const k = q.trim().toLowerCase();
    return rows.filter((r) =>
      [
        r.id,
        r.type,
        r.document?.fileName,
        r.document?.fileType,
        r.user?.email,
        r.user?.name,
        r.user?.surname,
        r.shamirSessionId ?? "",
      ]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(k))
    );
  }, [rows, q]);

  async function onVerify(id: string) {
    try {
      setVerifyingId(id);
      const res = await fetch(`/api/signatures/${id}/verify`, { method: "POST" });
      const data = (await res.json()) as VerifyResult;
      const tone =
        data.status === "OK" ? "✅" :
        data.status === "WARN" ? "🟡" :
        data.status === "NOT_IMPLEMENTED" ? "🧪" : "⛔";
      alert(`${tone} ${data.message}`);
    } catch (e: any) {
      alert(`⛔ Ошибка проверки: ${e?.message ?? e}`);
    } finally {
      setVerifyingId(null);
    }
  }

  // Открыть выбор файла
  function onLoadClick() {
    fileInputRef.current?.click();
  }

  // Загрузка выбранного файла
  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // опционально можно передать тип подписи, если хочешь:
      // fd.append("type", "CMS-GOST");

      const res = await fetch("/api/signatures/load", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());

      const created = (await res.json()) as SignatureRow;
      // оптимистично добавим сверху
      setRows((prev) => [created, ...prev]);

      // очистим value, чтобы можно было выбрать тот же файл ещё раз
      if (fileInputRef.current) fileInputRef.current.value = "";

      alert("✅ Файл загружен и запись создана");
    } catch (e: any) {
      alert(`⛔ Не удалось загрузить: ${e?.message ?? e}`);
    } finally {
      setLoadBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Верхняя панель */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Подписи</h1>

        <div className="ml-auto flex items-center gap-2 w-full md:w-auto">
          <div className="w-full md:w-80">
            <Input
              placeholder="Поиск: файл, e‑mail, тип, ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <Tooltip content="Загрузить файл подписи и создать запись">
            <Button onClick={onLoadClick} disabled={loadBusy}>
              {loadBusy ? "Загружаю…" : "Загрузить"}
            </Button>
          </Tooltip>

          {/* скрытый file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            // подбери список расширений по своему стеку:
            accept=".sig,.p7s,.pem,.cer,.crt,.der,.cms,.pkcs7,.bin,.dat,.pdf"
            onChange={onFilePicked}
          />
        </div>
      </div>

      {/* Список */}
      <SignList
        rows={filtered}
        loading={loading}
        verifyingId={verifyingId}
        onVerifiedStart={onVerify}
      />
    </div>
  );
}
