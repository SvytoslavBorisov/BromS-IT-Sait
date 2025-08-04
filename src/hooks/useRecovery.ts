// src/hooks/useRecovery.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { decodeCiphertext } from "@/lib/crypto/keys";
import { loadPrivateJwk }   from "@/lib/crypto/secure-storage";
import {
  verifyShare,
  reconstructSecretVSS,
} from "@/lib/crypto/shamir";

export interface IncomingShare {
  x: string;
  ciphertext: unknown;
}

export function useRecovery(
  sessionId: string,
  p: bigint,
  q: bigint,
  g: bigint,
  commitments: bigint[],
  threshold: number
) {
  // NextAuth session
  const { data: session, status: authStatus } = useSession();

  const [recoveryId,    setRecoveryId]    = useState<string | null>(null);
  const [returned,      setReturned]      = useState<IncomingShare[]>([]);
  const [statusMsg,     setStatusMsg]     = useState("");
  const [secret,        setSecret]        = useState<string | null>(null);
  const [error,         setError]         = useState<string | null>(null);

  // приватный ключ для дешифра
  const privKeyRef = useRef<CryptoKey | null>(null);

  // Импорт приватного ключа, как только у нас есть идефикс из сессии
  useEffect(() => {
    if (authStatus !== "authenticated" || !session) return;
    (async () => {
      try {
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
  }, [authStatus, session]);

  // Запустить новую сессию восстановления
  const start = useCallback(async () => {
    if (authStatus !== "authenticated") {
      setError("Требуется аутентификация");
      return;
    }
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
      setStatusMsg("Recovery запущен, ожидаем доли…");
    } catch (e: any) {
      setError(e.message);
    }
  }, [authStatus, sessionId]);

  // Проверить статус и собрать доли
  const check = useCallback(async () => {
    if (!recoveryId) return;
    setError(null);

    try {
      const res = await fetch(`/api/recovery/${recoveryId}/secret`);
      if (res.status === 409) {
        setStatusMsg(`Ждём минимум ${threshold} долей…`);
        return;
      }
      const { shares: recvd }: { shares: IncomingShare[] } = await res.json();
      setReturned(recvd);
      setStatusMsg(`Получено ${recvd.length} из ${threshold} долей`);

      // Дешифруем, фильтруем валидные и восстанавливаем
      const pts: [bigint, bigint][] = [];
      for (const { x, ciphertext } of recvd) {
        const cipherBuf = decodeCiphertext(ciphertext);
        const plainBuf = await crypto.subtle.decrypt(
          { name: "RSA-OAEP" },
          privKeyRef.current!,
          cipherBuf
        );
        const u8 = new Uint8Array(plainBuf);
        const hex = Array.from(u8)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        pts.push([BigInt(x), BigInt("0x" + hex)]);
      }

      const valid = pts.filter((pt) =>
        verifyShare(pt, p, g, commitments, q)
      );
      if (valid.length < threshold) {
        throw new Error(
          `Найдены только ${valid.length} валидных долей из ${threshold}`
        );
      }

      const secretInt = reconstructSecretVSS(valid, q);
      let hx = secretInt.toString(16);
      if (hx.length % 2) hx = "0" + hx;
      const bytes = Uint8Array.from(
        hx.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
      );
      setSecret(new TextDecoder().decode(bytes));
      setStatusMsg("Секрет восстановлен!");

      // Завершаем сессию
      await fetch(`/api/recovery/${recoveryId}`, { method: "DELETE" });
    } catch (e: any) {
      setError(e.message);
    }
  }, [recoveryId, p, q, g, commitments, threshold]);

  return {
    recoveryId,
    returned,
    statusMsg,
    secret,
    error,
    start,
    check,
  };
}
