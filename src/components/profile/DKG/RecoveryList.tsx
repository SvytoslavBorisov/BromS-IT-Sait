"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string; sourceSessionId: string; status: string;
  n: number; t: number; epoch: string; qHash: string;
  participantsCount?: number; sharesCount?: number; createdAt?: string;
};

export default function RecoveryList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const load = async () => {
    setErr(null); setLoading(true);
    try {
      const r = await fetch("/api/dkg/recovery", { cache: "no-store" }).then(res => res.json());
      setRows(r?.items || []);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, []);

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Комнаты восстановления</h2>
        <button onClick={load} className="text-sm border rounded px-3 py-1" disabled={loading}>
          {loading ? "Обновляем…" : "Обновить"}
        </button>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      {rows.length === 0 ? <div className="text-sm text-neutral-500">Пока пусто.</div> : (
        <ul className="space-y-2">
          {rows.map(r => (
            <li key={r.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">#{r.id} — {r.status}</div>
                <div className="text-neutral-500">
                  src={r.sourceSessionId} · n={r.n} · t={r.t} · epoch={r.epoch}
                  {typeof r.participantsCount === "number" && <> · участники: {r.participantsCount}</>}
                  {typeof r.sharesCount === "number" && <> · доли: {r.sharesCount}</>}
                </div>
              </div>
              <button className="px-3 py-2 rounded-md bg-black text-white" onClick={() => router.push(`/profile/dkg/recovery/rooms/${r.id}`)}>
                Открыть
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
