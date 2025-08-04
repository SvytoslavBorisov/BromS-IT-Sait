// src/components/profile/RecoverSecret.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { jwkFingerprint } from "@/lib/crypto/fingerprint";
import { loadPrivateJwk } from "@/lib/crypto/secure-storage";
import { decodeCiphertext } from "@/lib/crypto/keys";
import {
  verifyShare,
  reconstructSecretVSS,
} from "@/lib/crypto/shamir";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface ShareRecord {
  x: string;
  ciphertext: unknown;
}

export default function RecoverSecret({ sessionId }: { sessionId: string }) {
  const [p, setP] = useState<bigint | null>(null);
  const [q, setQ] = useState<bigint | null>(null);
  const [g, setG] = useState<bigint | null>(null);
  const [commitments, setCommitments] = useState<bigint[]>([]);
  const [threshold, setThreshold]   = useState<number>(0);
  const [shares, setShares]         = useState<ShareRecord[]>([]);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [loading, setLoading]       = useState(false);
  const [secret, setSecret]         = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const privKeyRef = useRef<CryptoKey | null>(null);
  const { status, data: session } = useSession();
  if (status !== "authenticated" || !session) return null;

  // 1) Загрузка приватного ключа + параметров VSS
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Импорт приватного ключа
        const privJwk = await loadPrivateJwk(session.user.id);
        if (!privJwk) throw new Error("Приватный ключ не найден");
        const privKey = await crypto.subtle.importKey(
          "jwk",
          privJwk,
          { name: "RSA-OAEP", hash: "SHA-256" },
          false,
          ["decrypt"]
        );
        privKeyRef.current = privKey;

        // Запрос параметров VSS
        const res = await fetch(
          `/api/shares/recover?sessionId=${sessionId}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data: {
          p: string;
          q: string;
          g: string;
          commitments: string[];
          threshold: number;
          shares: ShareRecord[];
        } = await res.json();

        setP(BigInt(data.p));
        setQ(BigInt(data.q));
        setG(BigInt(data.g));
        setCommitments(data.commitments.map((c) => BigInt(c)));
        setThreshold(data.threshold);
        setShares(data.shares);
        setError(null);
      } catch (e: any) {
        console.error("init RecoverSecret:", e);
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [session.user.id, sessionId]);

  // Выбор долей
  const toggle = (x: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(x) ? next.delete(x) : next.add(x);
      return next;
    });

  // 2) Сбор и верификация долей → восстановление
  const handleRecover = async () => {
    if (!p || !q || !g || !privKeyRef.current) return;
    setLoading(true);
    setError(null);

    try {
      // Дешифруем и собираем точки
      const points: [bigint, bigint][] = [];
      console.log(0);
      for (const rec of shares.filter((s) => selected.has(s.x))) {
        const buf = await crypto.subtle.decrypt(
          { name: "RSA-OAEP" },
          privKeyRef.current,
          decodeCiphertext(rec.ciphertext)
        );
        const hex = new TextDecoder().decode(buf).replace(/^0x/i, "");
        points.push([BigInt(rec.x), BigInt("0x" + hex)]);
      }
      console.log(1);
      // Верифицируем через Feldman VSS
      const valid = points.filter((pt) =>
        verifyShare(pt, p, g, commitments)
      );
      if (valid.length < threshold) {
        throw new Error(
          `Требуется ${threshold} валидных долей, получено ${valid.length}`
        );
      }
      console.log(1);
      // Восстанавливаем через reconstructSecretVSS(mod q)
      let secretInt = reconstructSecretVSS(valid, q);
      console.log(2);
      let hex = secretInt.toString(16);
      console.log(3);
      if (hex.length % 2) hex = "0" + hex;
      console.log(4);
      const bytes = Uint8Array.from(
        hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
      );
      console.log(5);
      setSecret(new TextDecoder().decode(bytes));
    } catch (e: any) {
      console.error("RecoverSecret:", e);
      setError(e.message ?? String(e));
      setSecret(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Восстановление… подождите.</p>;
  if (error)   return <p className="text-red-500">Ошибка: {error}</p>;

  return (
    <Card>
      <CardHeader title="Восстановление секрета" />
      <CardContent>
        <p>Порог: {threshold}, выбрано: {selected.size}</p>
        <ScrollArea className="h-48 mb-4">
          <ul className="space-y-2">
            {shares.map((s) => {
              const sel = selected.has(s.x);
              return (
                <li
                  key={s.x}
                  onClick={() => toggle(s.x)}
                  className={`p-2 border rounded cursor-pointer select-none ${
                    sel
                      ? "bg-green-50 border-green-600"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  x = {s.x}
                </li>
              );
            })}
          </ul>
        </ScrollArea>

        <Button
          onClick={handleRecover}
          disabled={selected.size < threshold}
        >
          Восстановить секрет
        </Button>

        {secret && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <p className="font-medium mb-2">Секрет:</p>
            <code className="break-all">{secret}</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
