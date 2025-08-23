"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useE2EAndMe } from "./hooks/useE2E";
import { useDkgPolling } from "./hooks/useDkgPolling";
import { appendLog, parseCiphertextCombined } from "./utils";
import { enc } from "@/lib/crypto/bigint-utils";
import {
  ensureE2EKeypair, getE2ESecret, polyGenerate, polyCommitments, polyEvalAt,
  verifyShare, computeQ, qHashHex, encryptToPk, decryptWithSk,
  serializeShare, transcriptHashHex, hex
} from "@/lib/dkg/client-crypto";
import type { ECPoint } from "@/lib/crypto/gost/ec";
import { q } from "@/lib/crypto/gost/ec";

type Participant = { userId: string; e2ePublicKey: string };

export default function DkgRoomPage() {
  const params = useParams<{ id: string }>();
  const roomId = params!.id;

  const { me, authErr } = useE2EAndMe();
  const state = useDkgPolling(roomId);

  const [log, setLog] = useState("");

  // раунды — локальное
  const [poly, setPoly] = useState<{ coeffs: bigint[] } | null>(null);
  const [myCommitments, setMyCommitments] = useState<ECPoint[] | null>(null);
  const [myFinalShare, setMyFinalShare] = useState<bigint | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  // при первом заходе — join (и гарантии ключей)
  useEffect(() => {
    let done = false;
    (async () => {
      if (!roomId) return;
      try {
        const { pkHex } = ensureE2EKeypair();
        // join
        await fetch(`/api/dkg/sessions/${roomId}/join`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ e2ePublicKey: pkHex }),
        });
      } catch (e: any) {
        appendLog(setLog, `ERROR: join failed: ${e?.message || String(e)}`);
      }
      done = true;
    })();
    return () => { done = true; };
  }, [roomId]);

  // кто я — продублируем id через parts, если надо
  useEffect(() => {
    const pkHex = typeof window !== "undefined" ? localStorage.getItem("e2e_pk_hex") : null;
    if (!pkHex || !state?.parts) return;
    const mePart = state.parts.find((p: any) => p.e2ePublicKey === pkHex);
    if (mePart && (!me || me.userId !== mePart.userId)) {
      // мягко — не ломаем состояние useE2EAndMe
      // appendLog(setLog, `info: me resolved via parts: ${mePart.userId}`);
    }
  }, [state.parts]); // eslint-disable-line

  const participants: Participant[] = useMemo(() => {
    return (state.parts || []).map((p: any) => ({ userId: p.userId, e2ePublicKey: p.e2ePublicKey }));
  }, [state.parts]);

  const N = state.ses?.n ?? 0;
  const T = state.ses?.t ?? 0;

  // ===== Round-1: publish commitments =====
  const round1_publishCommitments = async () => {
    if (!state.ses || !me) return appendLog(setLog, "ERROR: not ready");
    if (publishing || published) return;

    setPublishing(true);
    try {
      const p = polyGenerate(T);
      const C = polyCommitments(p);
      setPoly(p); setMyCommitments(C);

      const payload = {
        from: me.userId,
        commitments: C.map(P => ({ x: P.x?.toString(16), y: P.y?.toString(16) })),
        signature: "-"
      };

      const r = await fetch(`/api/dkg/sessions/${roomId}/commitments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }).then(r => r.json());

      if (r?.ok) {
        appendLog(setLog, "✔ Round-1: commitments published");
        setPublished(true);
      } else {
        appendLog(setLog, `ERROR: commitments: ${r?.error || "unknown"}`);
      }
    } catch (e: any) {
      appendLog(setLog, `ERROR: commitments: ${e?.message || String(e)}`);
    } finally {
      setPublishing(false);
    }
  };

  // ===== Round-2: send encrypted shares =====
  const round2_sendShares = async () => {
    if (!poly || !me) return appendLog(setLog, "ERROR: generate commitments first");
    for (const [idx, part] of participants.entries()) {
      const i = idx + 1;
      const sji = polyEvalAt(poly, i);
      const plaintext = serializeShare(roomId!, me.userId, part.userId, sji);
      const aad = enc.encode(`dkg:${roomId}:share:${me.userId}->${part.userId}`);
      const ct = encryptToPk(part.e2ePublicKey, plaintext, aad);
      const ciphertextCombined =
        Buffer.from(ct.ct).toString("hex") + "|" +
        Buffer.from(ct.tag).toString("hex") + "|" +
        Buffer.from(enc.encode(JSON.stringify({ Rx: ct.R.x!.toString(16), Ry: ct.R.y!.toString(16) }))).toString("hex");

      if (part.userId === me.userId) {
        const aadSelf = enc.encode(`dkg:${roomId}:share:${me.userId}->${me.userId}`);
        const ptSelf = decryptWithSk(localStorage.getItem("e2e_sk_hex")!, ct as any, aadSelf);
        const back = new TextDecoder().decode(ptSelf);
        appendLog(setLog, `[self-test] ok: ${back.length} bytes`);
      }

      await fetch(`/api/dkg/sessions/${roomId}/shares`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from: me.userId,
          to: part.userId,
          ciphertextCombined,
          transcriptHash: transcriptHashHex({ roomId, from: me.userId, to: part.userId }),
          signature: "-",
        }),
      });
    }
    appendLog(setLog, "✔ Round-2: shares sent to all");
  };

  // ===== Round-3: decrypt, verify, finish =====
  const round3_verifyAndFinish = async () => {
    if (!state.ses || !me) return appendLog(setLog, "ERROR: not ready");

    const inbox = (state.outbox || []).filter((m: any) => m.toUserId === me!.userId);
    appendLog(setLog, `inbox: ${inbox.length} items`);
    if (inbox.length < participants.length - 1) appendLog(setLog, "⚠ получено меньше N-1 зашифрованных долей");

    const shares: { from: string; sji: bigint }[] = [];
    for (const m of inbox) {
      try {
        const parsed = parseCiphertextCombined(m.ciphertextCombined);
        const aad = enc.encode(`dkg:${roomId}:share:${m.fromUserId}->${m.toUserId}`);
        appendLog(setLog, `[dbg] from=${m.fromUserId} ct=${parsed.ct.length} tag=${parsed.tag.length} aad="${new TextDecoder().decode(aad)}"`);

        const pt = decryptWithSk(localStorage.getItem("e2e_sk_hex")!, parsed as any, aad);
        const obj = JSON.parse(new TextDecoder().decode(pt));
        shares.push({ from: m.fromUserId, sji: BigInt("0x" + obj.s) });
      } catch (e: any) {
        appendLog(setLog, `ERROR: decrypt from ${m.fromUserId}: ${e?.message || String(e)}`);
      }
    }

    // карта коммитментов
    const commitmentsMap = new Map<string, ECPoint[]>();
    for (const c of state.cmts) {
      const arr: ECPoint[] = (c.commitments as any[]).map((p: any) => ({ x: BigInt("0x" + p.x), y: BigInt("0x" + p.y) }));
      commitmentsMap.set(c.fromUserId, arr);
    }

    let okCount = 0;
    const myIndex = participants.findIndex(p => p.userId === me.userId) + 1;
    for (const sh of shares) {
      const Cj = commitmentsMap.get(sh.from)!;
      if (!verifyShare(myIndex, sh.sji, Cj)) appendLog(setLog, `ERROR: share from ${sh.from} failed Feldman check`);
      else okCount++;
    }
    appendLog(setLog, `✔ Verified shares: ${okCount}/${shares.length}`);

    if (!shares.find(s => s.from === me.userId) && poly) {
      shares.push({ from: me.userId, sji: polyEvalAt(poly, myIndex) });
    }

    const s_i = shares.reduce((acc, s) => (acc + s.sji) % q, 0n);
    setMyFinalShare(s_i);
    appendLog(setLog, "✔ Final share computed");

    const allC: ECPoint[][] = state.cmts.map((c: any) =>
      (c.commitments as any[]).map((p: any) => ({ x: BigInt("0x" + p.x), y: BigInt("0x" + p.y) } as ECPoint))
    );
    const Q = computeQ(allC);
    const Qhash = qHashHex(Q);

    const transcriptHash = transcriptHashHex({
      roomId,
      cmts: state.cmts.map((c: any) => c.id),
      inbox: inbox.map((m: any) => m.id),
    });

    await fetch(`/api/dkg/sessions/${roomId}/ready`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ Qhash, transcriptHash }),
    });
    appendLog(setLog, `✔ Ready posted, Qhash=${Qhash.slice(0, 16)}…`);
  };

  if (authErr) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-red-600">Ошибка: {authErr}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-bold">DKG Room #{roomId}</h1>

      <section className="border rounded-xl p-4">
        <div className="text-sm">Участники: {(state.parts || []).length} / {state.ses?.n ?? "?"}</div>
        <div className="text-xs text-neutral-500">Порог t = {state.ses?.t ?? "?"} · epoch = {state.ses?.epoch ?? "?"}</div>
      </section>

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Раунд 1 — Коммитменты</h2>
        <button disabled={publishing || published} onClick={round1_publishCommitments} className="px-3 py-2 rounded-md border">
          {published ? "Коммитменты опубликованы" : publishing ? "Публикуем…" : "Сгенерировать и опубликовать"}
        </button>
        <div className="text-xs text-neutral-500 mt-2">Получено наборов: {(state.cmts || []).length} / {state.ses?.n ?? "?"}</div>
      </section>

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Раунд 2 — Доли</h2>
        <button className="px-3 py-2 rounded-md bg-black text-white" onClick={round2_sendShares}>
          Отправить доли всем
        </button>
        <div className="text-xs text-neutral-500 mt-2">
          Входящие мне: {(state.outbox || []).filter((m: any) => m.toUserId === me?.userId).length} / {participants.length}
        </div>
      </section>

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Раунд 3 — Проверка и финал</h2>
        <button className="px-3 py-2 rounded-md bg-black text-white" onClick={round3_verifyAndFinish}>
          Проверить доли и завершить
        </button>
        <div className="text-xs text-neutral-500 mt-2">
          Готовы: {(state.ready || []).length} / {participants.length}
        </div>
        {myFinalShare && (
          <div className="text-xs text-green-700 mt-2">
            Моя доля sᵢ (hex): {myFinalShare.toString(16)}
          </div>
        )}
      </section>

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold mb-2">Лог</h2>
        <pre className="bg-neutral-900 text-neutral-100 p-3 rounded text-xs whitespace-pre-wrap min-h-[120px]">
          {log || "— лог пуст —"}
        </pre>
      </section>
    </div>
  );
}
