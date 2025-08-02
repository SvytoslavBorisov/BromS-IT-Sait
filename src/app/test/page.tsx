"use client";

import { useState, useEffect } from "react";
import {
  encryptAndStore,
  loadAndDecrypt,
} from "@/lib/crypto/secure-storage";
import { shareSecret } from "@/lib/crypto/shamir";

// Шифрование доли публичным ключом
async function encryptWithPubkey(share: string, jwkPub: JsonWebKey) {
  const pub = await crypto.subtle.importKey(
    "jwk",
    jwkPub,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
  const data = new TextEncoder().encode(share);
  const ct = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, data);
  return new Uint8Array(ct);
}

export default function SecretManager() {
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState("");
  const [participants, setParticipants] = useState<
    { id: string; publicKey: JsonWebKey }[]
  >([]);
  const [threshold, setThreshold] = useState(2);
  const [loadedSecret, setLoadedSecret] = useState<string | null>(null);

  // Загружаем участников и их публичные ключи
  useEffect(() => {
    fetch("/api/participants")
      .then((res) => res.json())
      .then((data) => setParticipants(data))
      .catch(console.error);
  }, []);

  // При изменении пароля — расшифровываем локально сохранённый секрет
  useEffect(() => {
    if (!password) {
      setLoadedSecret(null);
      return;
    }
    async function load() {
      try {
        const s = await loadAndDecrypt(password);
        setLoadedSecret(s);
      } catch {
        setLoadedSecret("Неверный пароль");
      }
    }
    load();
  }, [password]);

  // Сохранение и распределение секрета
  const handleSave = async () => {
    if (!password || !secret || participants.length < threshold) return;
    try {
      // 1) Сохраняем зашифрованный секрет локально
      await encryptAndStore(secret, password);

      // 2) Делим на доли
      const { prime, points } = shareSecret(
        new TextEncoder().encode(secret),
        threshold,
        participants.length
      );

      alert(points);

      // 3) Шифруем каждую долю и готовим к отправке
      const sharesPayload = await Promise.all(
        points.map(async ([x, y], idx) => {
          const { id, publicKey } = participants[idx];
          const shareValue = y.toString(16);
          const ciphertext = Array.from(
            await encryptWithPubkey(shareValue, publicKey)
          );
          return {
            id,
            x: x.toString(),       // BigInt → string
            ciphertext,            // Uint8Array → number[]
          };
        })
      );


      // 4) Отправляем на сервер
      await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prime: prime.toString(),   // <— вот здесь
          threshold,
          shares: sharesPayload,
        }),
      });

      setSecret("");
      alert("Секрет успешно сохранён и распределён");
    } catch (e) {
      console.error(e);
      alert("Не удалось сохранить или раздать доли");
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl mb-2">Управление секретом</h2>

      <input
        type="password"
        placeholder="Пароль для шифрования"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full mb-2 p-2 border rounded"
      />

      <textarea
        placeholder="Введите секрет"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        className="w-full mb-2 p-2 border rounded"
      />

      <input
        type="number"
        placeholder="Порог (t)"
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
        className="w-full mb-2 p-2 border rounded"
        min={1}
        max={participants.length}
      />

      <button
        onClick={handleSave}
        className="w-full py-2 bg-blue-600 text-white rounded"
      >
        Сохранить и распределить
      </button>

      {loadedSecret !== null && (
        <div className="mt-4 p-2 border">
          <strong>Локально загруженный секрет:</strong> {loadedSecret}
        </div>
      )}
    </div>
  );
}
