"use client";

import React, { useEffect, useState } from "react";
import { useSession }                 from "next-auth/react";
import { ScrollArea }                 from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button }                     from "@/components/ui/button";
import { loadPrivateJwk }             from "@/lib/crypto/secure-storage";
import { decodeCiphertext }           from "@/lib/crypto/keys";
import { jwkFingerprint }             from "@/lib/crypto/fingerprint";

interface ShareRequest {
  id:         string;   // recoveryId
  x:          string;   // координата
  dealerId:   string;
  ciphertext: number[]; // массив чисел, как возвращает JSON
}

export default function ProfileProcesses() {
  const { status, data: session } = useSession();
  const [requests, setRequests]   = useState<ShareRequest[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState<string | null>(null);

  // 1) Загрузим все pending-запросы на отдачу доли
  useEffect(() => {
    if (status !== "authenticated" || !session) return;

    (async () => {
      setLoading(true);
      try {
        // добавляем sessionId, чтобы API знал, по какой сессии брать запросы
        const res = await fetch("/api/recovery?role=shareholder", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Не удалось загрузить запросы");
        const json = (await res.json()) as { requests: ShareRequest[] };
        setRequests(json.requests);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [status, session]);

  // 2) Обработчик «Отдать долю»
  const handleGive = async (req: ShareRequest) => {
    if (status !== "authenticated" || !session) return;
    setError(null);

    try {
      // a) загрузим приватный ключ именно для текущего юзера
      const privJwk = await loadPrivateJwk(session.user.id);
      if (!privJwk) throw new Error("Приватный ключ не найден");
      const privKey = await crypto.subtle.importKey(
        "jwk",
        privJwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"]
      );

      console.log('Ломается тут1', req.ciphertext);
      // b) расшифруем пришедший ciphertext (массив чисел)
      const cipherBytes = decodeCiphertext(req.ciphertext);
      console.log('Ломается тут2', cipherBytes);
      const plainBuf    = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privKey,
        cipherBytes
      );
      const pubRes = await fetch(`/api/users/${req.dealerId}/pubkey`);
      const { jwk: dealerJwk } = await pubRes.json();
      const dealerKey = await crypto.subtle.importKey(
        "jwk", dealerJwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false, ["encrypt"]
      );
      console.log('Доля', plainBuf);
      
      // 5) Шифруем ваш открытый буфер этим ключом
      const newCtBuf = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        dealerKey,
        plainBuf
      );

      // 6) Преобразуем Uint8Array → number[]
      const newCtArr = Array.from(new Uint8Array(newCtBuf));

      let bin = "";
      for (let i = 0; i < newCtArr.length; i++) {
        bin += String.fromCharCode(newCtArr[i]);
      }

      // 3) Кодируем в Base64
      const b64 = btoa(bin); 
      // b64 = "O4jCmTZ1DS0K1x3wyyFR+/3i+..."

      // 4) Разбиваем строку на массив одиночных символов
      const charArr = b64.split(""); 
      // ["O","4","j","C","m","T","Z","1",…,"=","="]

      // 5) Если нужен строковый литерал JSON, можно:
      const json = JSON.stringify(charArr);

      // 7) Отправляем именно этот массив байт
      console.log('Process', json);
      const putRes = await fetch(`/api/recovery/${req.id}/receipt`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ciphertext: json }),
      });
      if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(err.error || putRes.statusText);
      }

      // e) убираем выполненный запрос из списка
      setRequests((rs) => rs.filter((r) => r.id !== req.id));
    }
    catch (e: any) {
      console.log('Тута');
      setError(e.message);
    };
  }

  if (status === "loading") return <p>Загрузка…</p>;
  if (status === "unauthenticated") return <p>Пожалуйста, войдите.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Запросы на отдачу доли</h1>
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
                ) : (
                  requests.map((req) => (
                    <li
                      key={req.id}
                      className="flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium">
                          Дилер {req.dealerId} запрашивает вашу долю x={req.x}
                        </p>
                      </div>
                      <Button onClick={() => handleGive(req)}>
                        Отдать долю
                      </Button>
                    </li>
                  ))
                )}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}