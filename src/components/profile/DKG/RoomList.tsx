"use client";

import React, { useEffect, useState } from "react";
import { ensureE2EKeypair } from "@/lib/dkg/client-crypto";
import { useRouter } from "next/navigation";

export type DkgSession = {
  id: string;
  n: number;
  t: number;
  epoch?: string;
  createdAt?: string;
  participantsCount?: number;
};

type ListResp = { ok: boolean; items: DkgSession[] } | DkgSession[];

type Props = {
  autoRefreshMs?: number; // по умолчанию 4с
};

export default function RoomList({ autoRefreshMs = 4000 }: Props) {
  const [rooms, setRooms] = useState<DkgSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const r: ListResp = await fetch("/api/dkg/sessions", { cache: "no-store" }).then(res => res.json());
      const items = Array.isArray(r) ? r : r?.items || [];
      setRooms(items);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let stop = false;
    load();
    const timer = setInterval(() => { if (!stop) load(); }, autoRefreshMs);
    return () => { stop = true; clearInterval(timer); };
  }, []);

  const quickJoin = async (roomId: string) => {
    try {
      const { pkHex } = ensureE2EKeypair();
      await fetch(`/api/dkg/sessions/${roomId}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ e2ePublicKey: pkHex }),
      });
      router.push(`/profile/dkg/rooms/${roomId}`);
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  };

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Текущие комнаты</h2>
        <button
          onClick={load}
          className="text-sm px-3 py-1 border rounded"
          disabled={loading}
        >
          {loading ? "Обновляем…" : "Обновить"}
        </button>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      {rooms.length === 0 ? (
        <div className="text-sm text-neutral-500">Комнат пока нет.</div>
      ) : (
        <ul className="space-y-2">
          {rooms.map(r => (
            <li key={r.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">#{r.id}</div>
                <div className="text-neutral-500">
                  n={r.n} · t={r.t}
                  {typeof r.participantsCount === "number" && <> · участников: {r.participantsCount}</>}
                  {r.epoch && <> · epoch: {r.epoch}</>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => quickJoin(r.id)}
                  className="px-3 py-2 rounded-md bg-black text-white"
                >
                  Подключиться
                </button>
                <button
                  onClick={() => router.push(`/profile/dkg/rooms/${r.id}`)}
                  className="px-3 py-2 rounded-md border"
                >
                  Открыть
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
