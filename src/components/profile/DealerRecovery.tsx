"use client";

import React, { useEffect, useState, useRef } from "react";
import { decodeCiphertext } from "@/lib/crypto/keys";
import { loadPrivateJwk }   from "@/lib/crypto/secure-storage";
import { reconstructSecret } from "@/lib/crypto/shamir";

interface Share {
  x: string;
  userId: string;
}

export default function DealerRecovery({
  sessionId,
  shares = [],
  threshold,
  prime,
}: {
  sessionId: string;
  shares?: Share[];
  threshold: number;
  prime: BigInt;
}) {
  const [recoveryId,     setRecoveryId]     = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [returnedShares, setReturnedShares] = useState<{ x: string; ciphertext: unknown }[] | null>(null);
  const [statusMessage,  setStatusMessage]  = useState<string>("");
  const [secret,         setSecret]         = useState<string | null>(null);

  const privKeyRef = useRef<CryptoKey | null>(null);

  // Импорт приватного ключа один раз
  useEffect(() => {
    (async () => {
      try {
        const privJwk = await loadPrivateJwk();
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
  }, []);

  // Вспомогательная конверсия ArrayBuffer → hex
  function bufferToHex(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // 1) Запускаем recovery
  const start = async () => {
    setError(null);
    if (!sessionId || shares.length === 0) {
      setError("Нужны sessionId и хотя бы одна доля");
      return;
    }
    try {
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareSessionId: sessionId,
          shareholderIds: shares.map(s => s.userId),
        }),
      });

      console.log(res);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setRecoveryId(json.recoveryId);
      setStatusMessage("Запрос отправлен. Ожидание ответов дольщиков…");
    } catch (e: any) {
      setError(e.message);
    }
  };

  // 2) Проверяем статус и, при готовности, собираем секрет
const checkStatus = async () => {
  if (!recoveryId) return;
  setError(null);

  try {
    const res = await fetch(`/api/recovery/${recoveryId}/secret`);
    if (res.status === 409) {
      setStatusMessage(`Получено недостаточно долей, ждём дальше…`);
      return;
    }
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || res.statusText);
    }

    const { shares: recvd } = await res.json() as {
      shares: { x: string; ciphertext: unknown }[];
    };
    console.log("✅ recvd shares:", recvd);

    // Проверяем порог
    console.log("ℹ️ threshold:", threshold, "получено:", recvd.length);
    if (recvd.length < threshold) {
      throw new Error(`Требуется ${threshold} доли, но получено только ${recvd.length}`);
    }

    // Собираем точки
    const points: [bigint, bigint][] = [];
    for (const rec of recvd) {
      console.log(` • дешифруем точку x=${rec.x}`);
      const cipherBytes = decodeCiphertext(rec.ciphertext);
      const plainBuf    = await crypto.subtle.decrypt(
        { name: "RSA-OAEP",  },
        privKeyRef.current!,
        cipherBytes
      );
      // plainBuf теперь содержит ASCII-hex-строку байт Y
      const hexText = new TextDecoder().decode(plainBuf).replace(/^0x/i, "");
      console.log("   hexText:", hexText);

      const x = BigInt(rec.x);
      const y = BigInt("0x" + hexText);
      console.log("   point:", [x, y]);
      points.push([x, y]);
    }

    // Перед реконструкцией — проверим prime
    console.log("ℹ️ prime:", prime);
    // И сами точки
    console.log("ℹ️ points for reconstruct:", points);

    const secretBytes = reconstructSecret(points, prime);
    console.log("🔑 secretBytes:", new Uint8Array(secretBytes));

    // Декодим как текст
    const decoded = new TextDecoder().decode(secretBytes);
    console.log("🔓 decoded secret:", decoded);

    setSecret(decoded);
    setStatusMessage("Секрет восстановлен!");
  } catch (e: any) {
    console.error("checkStatus error:", e);
    setError(e.message);
  }
  // Звоним на DELETE, чтобы удалить данные из БД
    try {
    await fetch(`/api/recovery/${recoveryId}`, { method: "DELETE" });
    console.log("RecoverySession deleted");
    } catch (e) {
    console.warn("Failed to delete recovery session:", e);
    }
};

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Восстановление секрета</h2>
      <p>
        Сессия: <code>{sessionId}</code><br />
        Всего долей: {shares.length}, порог: {threshold}
      </p>

      {error && <p className="text-red-500">{error}</p>}

      {!recoveryId ? (
        <button onClick={start} className="btn">
          Начать восстановление
        </button>
      ) : (
        <div className="space-y-2">
          <p>Recovery ID: <code>{recoveryId}</code></p>
          <p>{statusMessage}</p>

          {!returnedShares && (
            <button onClick={checkStatus} className="btn-outline">
              Проверить статус
            </button>
          )}

          {returnedShares && !secret && (
            <p>Доля(ей) получено: {returnedShares.length} из {threshold}</p>
          )}

          {secret && (
            <div className="p-4 bg-gray-50 rounded">
              <p className="font-medium">Восстановленный секрет:</p>
              <code className="break-all">{secret}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
