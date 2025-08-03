"use client";

import React, { useEffect, useRef, useState } from "react";
import { reconstructSecret }   from "@/lib/crypto/shamir";
import { jwkFingerprint }  from "@/lib/crypto/fingerprint";
import { loadPrivateJwk } from "@/lib/crypto/secure-storage";
import { decodeCiphertext }    from "@/lib/crypto/keys";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { ScrollArea }          from "@/components/ui/scroll-area";
import { Button }              from "@/components/ui/button";

interface ShareRecord {
  x: string;        
  ciphertext: string; 
}

interface RecoverSecretProps {
  sessionId: string;
}

export default function RecoverSecret({ sessionId }: RecoverSecretProps) {
  const [prime,      setPrime]      = useState<bigint | null>(null);
  const [threshold,  setThreshold]  = useState<number>(0);
  const [shares,     setShares]     = useState<ShareRecord[]>([]);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [loading,    setLoading]    = useState(false);
  const [secret,     setSecret]     = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const privKeyRef = useRef<CryptoKey | null>(null);

  /* ---------- первичная загрузка ---------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const privJwk = await loadPrivateJwk();
        if (!privJwk) {
          throw new Error("Приватный ключ не найден в IndexedDB");
        }

        // 1a. Для отладки: печатаем отпечаток привата
        const privFp = await jwkFingerprint(privJwk);
        console.log("PRIV fingerprint:", privFp);

        /* 2. Импортируем его в CryptoKey */
        const privKey = await crypto.subtle.importKey(
          "jwk",
          privJwk,
          { name: "RSA-OAEP", hash: "SHA-256" },
          false,
          ["decrypt"]
        );
        privKeyRef.current = privKey;
        /* 2. Запрашиваем параметры сессии */
        const res = await fetch(`/api/shares/recover?sessionId=${sessionId}`);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data: {
          prime: string;
          threshold: number;
          shares: ShareRecord[];
        } = await res.json();

        setPrime(BigInt(data.prime));
        setThreshold(data.threshold);
        setShares(data.shares);
      } catch (e: any) {
        console.error("RecoverSecret init:", e);
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  /* ---------- взаимодействие ---------- */
  const toggle = (x: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(x) ? next.delete(x) : next.add(x);
      return next;
    });

  const handleRecover = async () => {
    if (!prime || !privKeyRef.current) return;
    setLoading(true);

    try {
      const points: [bigint, bigint][] = [];

    for (const rec of shares.filter(s => selected.has(s.x))) {
      // Выводим исходный ciphertext для отладки
      console.dir(rec.ciphertext, { depth: null });

      // Любое представление ciphertext → Uint8Array
      const cipherBytes = decodeCiphertext(rec.ciphertext);

      // RSA-OAEP decrypt с тем же hash, что и при шифровании
      let plainBuf: ArrayBuffer;
      try {
        plainBuf = await crypto.subtle.decrypt(
          { name: "RSA-OAEP"},
          privKeyRef.current!,
          cipherBytes
        );
      } catch (e: any) {
        console.error(`Ошибка при расшифровке доли x=${rec.x}:`, e);
        throw new Error(`Не удалось расшифровать долю x=${rec.x}: ${e.message}`);
      }

      // Получаем hex-строку без 0x-префикса
      const hex = new TextDecoder()
        .decode(plainBuf)
        .replace(/^0x/i, "");

      points.push([ BigInt(rec.x), BigInt("0x" + hex) ]);
    }

      /* 2. Восстанавливаем секрет через полином Шамира */
      const recoveredBytes = reconstructSecret(points, prime);
      setSecret(new TextDecoder().decode(recoveredBytes));
      setError(null);
    } catch (e: any) {
      console.error("RecoverSecret decrypt:", e);
      setError(e.message ?? String(e));
      setSecret(null);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */
  if (loading) return <p>Восстановление… это может занять несколько секунд.</p>;
  if (error)   return <p className="text-red-500">Ошибка: {error}</p>;

  return (
    <Card>
      <CardHeader title="Восстановление секрета" />
      <CardContent>
        <ScrollArea className="h-48">
          <ul className="space-y-2">
            {shares.map(s => {
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
            <p className="font-medium mb-2">Восстановленный секрет:</p>
            <code className="break-all">{secret}</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}