"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { decodeCiphertext } from "@/lib/crypto/keys";
import { loadPrivateJwk }   from "@/lib/crypto/secure-storage";
import {
  shareSecretVSS,
  verifyShare,
  reconstructSecretVSS,
} from "@/lib/crypto/shamir";

interface IncomingShare {
  x: string;
  ciphertext: unknown;
}

export interface VSSShare {
  x: string;
  ciphertext: number[] | JSON;
  userId: string;
}

interface DealerRecoveryProps {
  sessionId:  string;
  p:          bigint;
  q:          bigint;
  g:          bigint;
  commitments: bigint[];
  threshold:  number;
  shares:     VSSShare[];
  status_recovery:     String
}

export default function DealerRecovery({
  sessionId,
  p,
  q,
  g,
  commitments,
  threshold,
  shares,
  status_recovery
}: DealerRecoveryProps) {
  const [recoveryId,    setRecoveryId]    = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [secret,        setSecret]        = useState<string | null>(null);
  const [returnedShares, setReturnedShares] = useState<IncomingShare[] | null>(null);
  const { status, data: session } = useSession();

  const privKeyRef = useRef<CryptoKey | null>(null);
  
  // Импорт приватного ключа
  useEffect(() => {
    (async () => {
      try {

        if (status !== "authenticated" || !session) return null;

        const privJwk = await loadPrivateJwk(session.user.id);
        if (!privJwk) throw new Error("Приватный ключ не найден");
        privKeyRef.current = await crypto.subtle.importKey(
          "jwk",
          privJwk,
          { name: "RSA-OAEP", hash: "SHA-256" },
          false,
          ["decrypt"]
        );
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [session?.user.id]);

  // Шаг 1: инициация recovery
  const start = async () => {
    setError(null);
    try {
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareSessionId: sessionId,
          shareholderIds: [], // пусть backend сам знает, кому слать
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setRecoveryId(json.recoveryId);
      setStatusMessage("Recovery запущен, ожидаем доли…");
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Шаг 2: проверка статуса и сбор долей
  const checkStatus = async () => {
    if (!recoveryId) return;
    setError(null);

    try {
      const res = await fetch(`/api/recovery/${recoveryId}/secret`);
      if (res.status === 409) {
        setStatusMessage(`Ждём минимум ${threshold} долей…`);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);

      const recvd: IncomingShare[] = json.shares;
      setReturnedShares(recvd);
      setStatusMessage(`Получено ${recvd.length} из ${threshold} долей`);

      // Дешифруем и собираем (x,y)
      const points: [bigint, bigint][] = [];
      console.log('Пункт 1 ', recvd);
      for (const { x, ciphertext } of recvd) {
        console.log('DEa', ciphertext);
        const cipherBuf = decodeCiphertext(ciphertext);
        const plainBuf = await crypto.subtle.decrypt(
          { name: "RSA-OAEP" },
          privKeyRef.current!,
          cipherBuf
        );
        console.log('DEa', cipherBuf);
        console.log('DEa', plainBuf);
        const hex = new TextDecoder().decode(plainBuf).replace(/^0x/i, "");
        points.push([BigInt(x), BigInt(hex)]);
        console.log('DEa', BigInt(x), BigInt(hex), p,q,g,commitments);
      }
      
      const valid = points.filter(pt =>
         verifyShare(pt, p, g, commitments, q)
      );
      if (valid.length < threshold) {
        throw new Error(
          `Найдены только ${valid.length} валидных долей из ${threshold}`
        );
      }
      console.log("ℹ️ Используемый модуль q:", q);
      // Восстановление секретa по модулю q
      const secretInt = reconstructSecretVSS(valid, q);

      console.log("secretInt:", q);
      // bigint → hex → Uint8Array → строка
      let hex = secretInt.toString(16);
      console.log("hex:", q);
      if (hex.length % 2) hex = "0" + hex;
      const bytes = Uint8Array.from(
        hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16))
      );
      console.log("bytes:", q);
      setSecret(new TextDecoder().decode(bytes));
      setStatusMessage("Секрет восстановлен!");

      // Завершить сессию: удаляем на сервере
      await fetch(`/api/recovery/${recoveryId}`, { method: "DELETE" });
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Восстановление секрета</h2>
      <p>Session: <code>{sessionId}</code></p>
      {error && <p className="text-red-500">{error}</p>}

      {!recoveryId ? (
        <button onClick={start} className="btn">Начать восстановление</button>
      ) : (
        <div className="space-y-2">
          <p>{statusMessage}</p>
          {!secret && (
            <button onClick={checkStatus} className="btn-outline">
              Проверить статус
            </button>
          )}
          {secret && (
            <div className="p-4 bg-gray-50 rounded">
              <p className="font-medium">Секрет:</p>
              <code className="break-all">{secret}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
