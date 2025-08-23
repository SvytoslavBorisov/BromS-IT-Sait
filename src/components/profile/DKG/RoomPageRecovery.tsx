"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ensureE2EKeypair } from "@/lib/dkg/client-crypto";

type State = {
  id: string;
  sourceSessionId: string;
  status: "OPEN"|"VERIFYING"|"DONE"|"FAILED";
  n: number; t: number; epoch: string; qHash: string;
  requesterUserId: string;
  resultCiphertext?: string | null;
  resultMeta?: any;
  participants: { userId: string }[];
  shares: { fromUserId: string; proofOk: boolean; createdAt: string }[];
};

export default function RecoveryRoomPage() {
  const params = useParams<{ id: string }>();
  const id = params!.id!;
  const [st, setSt] = useState<State | null>(null);
  const [sHex, setSHex] = useState("");
  const [log, setLog] = useState("");
  const [joining, setJoining] = useState(false);
  const [sending, setSending] = useState(false);

  const append = (s: string) => setLog(p => (p ? p + "\n" : "") + s);

  // join сразу
  useEffect(() => {
    let stop = false;
    (async () => {
      const { pkHex } = ensureE2EKeypair();
      setJoining(true);
      try {
        await fetch(`/api/dkg/recovery/${id}/join`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ e2ePublicKey: pkHex })
        });
      } catch (e: any) {
        append("join error: " + (e?.message || String(e)));
      } finally {
        setJoining(false);
      }

      while (!stop) {
        const r = await fetch(`/api/dkg/recovery/${id}/state`, { cache: "no-store" }).then(res => res.json());
        if (r?.ok) setSt(r.item);
        await new Promise(res => setTimeout(res, 1200));
      }
    })();
    return () => { stop = true; };
  }, [id]);

  const participants = useMemo(() => st?.participants?.length ?? 0, [st]);

  const submitShare = async () => {
    setSending(true);
    try {
      const r = await fetch(`/api/dkg/recovery/${id}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sHex: sHex.trim() })
      }).then(res => res.json());
      if (!r?.ok) throw new Error(r?.error || "submit failed");
      append(`✔ отправлено, proofOk=${r.proofOk}`);
      setSHex("");
    } catch (e: any) {
      append("error: " + (e?.message || String(e)));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">Recovery Room #{id}</h1>

      <section className="border rounded-xl p-4">
        <div className="text-sm">Статус: <b>{st?.status || "…"}</b></div>
        <div className="text-xs text-neutral-500">n={st?.n} · t={st?.t} · epoch={st?.epoch} · Qhash={st?.qHash?.slice(0,16)}…</div>
      </section>

      <section className="border rounded-xl p-4 space-y-2">
        <h2 className="font-semibold">Участники / доли</h2>
        <div className="text-sm">Участников: {participants} · Принято долей: {st?.shares?.length ?? 0}</div>
        <ul className="text-xs text-neutral-600 list-disc pl-5">
          {(st?.shares ?? []).map(s => (
            <li key={s.fromUserId}>{s.fromUserId} — {s.proofOk ? "ok" : "invalid"}</li>
          ))}
        </ul>
      </section>

      <section className="border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Отправить свою итоговую долю sᵢ</h2>
        <input
          className="border rounded px-2 py-1 w-full"
          placeholder="sᵢ в hex (BE)"
          value={sHex}
          onChange={e => setSHex(e.target.value)}
        />
        <button className="px-3 py-2 rounded-md bg-black text-white" onClick={submitShare} disabled={sending || !sHex}>
          {sending ? "Отправляем…" : "Отправить"}
        </button>
      </section>

      {st?.status === "DONE" && (
        <section className="border rounded-xl p-4 space-y-2">
          <h2 className="font-semibold">Результат</h2>
          <div className="text-sm break-all">
            <div className="text-neutral-500">resultCiphertext:</div>
            <div className="text-xs">{st?.resultCiphertext}</div>
          </div>
        </section>
      )}

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Лог</h2>
        <pre className="bg-neutral-900 text-neutral-100 p-3 rounded text-xs whitespace-pre-wrap min-h-[120px]">
          {log || "— лог пуст —"}
        </pre>
      </section>
    </div>
  );
}
