"use client";

import { useState, useCallback, useEffect } from "react";
import { decodeCiphertext }      from "@/lib/crypto/keys";
import {
  shareSecretVSS,
  verifyShare,
  reconstructSecretVSS,
} from "@/lib/crypto/shamir";

import type { DealerRecoveryProps, IncomingShare } from "./types";

export function useDealerLogic(
  {
    sessionId, p, q, g, commitments, threshold, shares, statusRecovery
  }: DealerRecoveryProps,
  privKeyRef: React.RefObject<CryptoKey | null>
) {
  const [recoveryId,     setRecoveryId]     = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [statusMessage,  setStatusMessage]  = useState<string>("");
  const [secret,         setSecret]         = useState<string | null>(null);
  const [returnedShares, setReturnedShares] = useState<IncomingShare[] | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareSessionId: sessionId, shareholderIds: [] }),
      }); 
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setRecoveryId(json.recoveryId);
      setStatusMessage("Recovery запущен, ожидаем доли…");
    } catch (e: any) {
      setError(e.message);
    }
  }, [sessionId]);

  const checkStatus = useCallback(async () => {
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
  }, [recoveryId, p, q, g, commitments, threshold, privKeyRef]);

  // **1. При старте компонента, если статус восстановления уже true, сразу вызываем start()**
  useEffect(() => {
    if (statusRecovery && !recoveryId) {
      start();
    }
  }, [statusRecovery, recoveryId, start]);

  // **2. Как только получен recoveryId, сразу делаем первый checkStatus() и далее можно по таймеру**
  useEffect(() => {
    if (!recoveryId) return;
    checkStatus();

  }, [recoveryId, checkStatus]);

  return {
    recoveryId,
    error,
    statusMessage,
    secret,
    returnedShares,
    start,
    checkStatus
  };
}