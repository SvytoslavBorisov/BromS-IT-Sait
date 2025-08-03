"use client";

import { useEffect, useState } from "react";
import { ScrollArea }            from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button }                from "@/components/ui/button";
import { loadPrivateJwk }        from "@/lib/crypto/secure-storage";
import { decodeCiphertext }      from "@/lib/crypto/keys";
import { jwkFingerprint }        from "@/lib/crypto/fingerprint";

interface ShareRequest {
  id:         string;   // recoveryId
  x:          string;   // coordinate
  dealerId:   string;
  ciphertext: unknown;  // raw from server
}

export default function ProfileProcesses() {
  const [requests, setRequests] = useState<ShareRequest[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/recovery?role=shareholder");
        if (!res.ok) throw new Error("Не удалось загрузить запросы");
        const json = await res.json() as { requests: ShareRequest[] };
        setRequests(json.requests);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleGive = async (req: ShareRequest) => {
    setError(null);
    try {
      // 1. Декодируем и расшифровываем локально
      const cipherBytes = decodeCiphertext(req.ciphertext);
      const privJwk      = await loadPrivateJwk();
      if (!privJwk) throw new Error("Приватный ключ не найден");
      const privKey = await crypto.subtle.importKey(
        "jwk", privJwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false, ["decrypt"]
      );
      const plain = await crypto.subtle.decrypt(
        { name: "RSA-OAEP"},
        privKey,
        cipherBytes
      );

      // 2. Запрашиваем публичный ключ дилера
      const pubRes = await fetch(`/api/users/${req.dealerId}/pubkey`);
      if (!pubRes.ok) throw new Error("Нет публичного ключа дилера");
      const { jwk: dealerPub } = await pubRes.json();

      // 3. Шифруем тем ключом
      const pubKey = await crypto.subtle.importKey(
        "jwk", dealerPub,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false, ["encrypt"]
      );
      const newCt = await crypto.subtle.encrypt(
        { name: "RSA-OAEP"},
        pubKey,
        plain
      );
      const newCtB64 = btoa(String.fromCharCode(...new Uint8Array(newCt)));

      // 4. Отправляем на сервер
      const putRes = await fetch(`/api/recovery/${req.id}/receipt`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ciphertext: newCtB64 }),
      });
      if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(err.error || putRes.statusText);
      }

      // 5. Убираем этот запрос из списка
      setRequests(rs => rs.filter(r => r.id !== req.id));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Запросы на отдачу доли</h1>
        <p className="text-sm text-gray-600">
          Здесь вы видите, когда дилер просит вашу долю
        </p>
      </div>

      <Card>
        <CardHeader title="Ожидающие запросы" />
        <CardContent>
          {loading && <p>Загрузка…</p>}
          {error   && <p className="text-red-500">Ошибка: {error}</p>}

          {!loading && !error && (
            <ScrollArea className="h-48">
              <ul className="space-y-3">
                {requests.length === 0 ? (
                  <li>Нет активных запросов</li>
                ) : requests.map((req) => (
                  <li key={req.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        Дилер {req.dealerId} просит вашу долю x={req.x}
                      </p>
                    </div>
                    <Button onClick={() => handleGive(req)}>
                      Отдать долю
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}