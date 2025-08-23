"use client";

import React, { useState } from "react";

type Props = { onCreated?: (id: string) => void };

export default function CreateRecoveryForm({ onCreated }: Props) {
  const [sourceId, setSourceId] = useState("");
  const [pubKey, setPubKey] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(null);
    if (!sourceId || !pubKey) { setErr("Укажи исходную DKG-сессию и публичный ключ получателя"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/dkg/recovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceSessionId: sourceId, requesterPubKey: pubKey })
      }).then(res => res.json());
      if (!r?.ok) throw new Error(r?.error || "Не удалось создать комнату восстановления");
      onCreated?.(r.id);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <h2 className="font-semibold">Создать комнату восстановления</h2>
      <div className="flex flex-col gap-2">
        <input className="border rounded px-2 py-1" placeholder="ID исходной DKG-сессии"
          value={sourceId} onChange={e => setSourceId(e.target.value.trim())} />
        <input className="border rounded px-2 py-1" placeholder="Публичный ключ получателя (hex)"
          value={pubKey} onChange={e => setPubKey(e.target.value.trim())} />
      </div>
      <button onClick={submit} disabled={loading} className="px-3 py-2 rounded-md bg-black text-white">
        {loading ? "Создаём…" : "Создать"}
      </button>
      {err && <div className="text-sm text-red-600">{err}</div>}
    </div>
  );
}
