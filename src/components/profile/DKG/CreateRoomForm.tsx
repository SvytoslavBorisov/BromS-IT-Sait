"use client";

import React, { useState } from "react";

type Props = {
  onCreated?: (roomId: string) => void;
};

export default function CreateRoomForm({ onCreated }: Props) {
  const [n, setN] = useState(3);
  const [t, setT] = useState(2);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (t < 2) return setErr("Порог t должен быть ≥ 2");
    if (n < 2) return setErr("Число участников n должно быть ≥ 2");
    if (t > n) return setErr("Порог t не может быть больше n");

    setLoading(true);
    try {
      const r = await fetch("/api/dkg/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ n, t }),
      }).then(res => res.json());

      if (!r?.ok || !r?.id) throw new Error(r?.error || "Не удалось создать комнату");
      onCreated?.(r.id);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <h2 className="font-semibold">Создать DKG-комнату</h2>
      <div className="flex gap-3">
        <label className="flex items-center gap-2">
          <span className="w-10">n</span>
          <input
            type="number"
            className="border rounded px-2 py-1 w-24"
            value={n}
            onChange={(e) => setN(parseInt(e.target.value || "0", 10))}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="w-10">t</span>
          <input
            type="number"
            className="border rounded px-2 py-1 w-24"
            value={t}
            onChange={(e) => setT(parseInt(e.target.value || "0", 10))}
          />
        </label>
        <button
          onClick={submit}
          disabled={loading}
          className="px-3 py-2 rounded-md bg-black text-white"
        >
          {loading ? "Создаём…" : "Создать"}
        </button>
      </div>
      {err && <div className="text-red-600 text-sm">{err}</div>}
    </div>
  );
}
