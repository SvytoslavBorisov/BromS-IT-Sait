// components/MyShares.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { format, isValid } from "date-fns";
import { verifyShare } from "@/lib/crypto/shamir"; // клиентская верификация
import { decodeCiphertext } from "@/lib/crypto/keys";
import { loadPrivateJwk }   from "@/lib/crypto/secure-storage";


interface Share {
  id: number;
  x: string;
  ciphertext: number[];
  status?: "ACTIVE" | "USED" | "EXPIRED";
  comment: string;
  encryptionAlgorithm: string;
  createdAt: string;
  expiresAt?: string | null;

  session: {
    p: string;
    q: string;
    g: string;
    commitments: string[];
    dealerId: string;
  };
}

// Передаём в компонент параметры VSS-сессии
interface MySharesProps {
  p:          bigint;
  q:          bigint;
  g:          bigint;
  commitments: bigint[];
}

export default function MyShares({ p, q, g, commitments }: MySharesProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { status, data: session } = useSession();

  const privKeyRef = useRef<CryptoKey | null>(null);

  useEffect(() => {
    fetch("/api/me/shares")
      .then(res => {
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        return res.json();
      })
      .then((data: Share[]) => setShares(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

  const renderStatus = (status?: Share["status"]) => {
    const st = status ?? "ACTIVE";
    let color = "bg-green-100 text-green-800";
    if (st === "USED") color = "bg-gray-100 text-gray-800";
    if (st === "EXPIRED") color = "bg-red-100 text-red-800";
    return <Badge className={color}>{st.toLowerCase()}</Badge>;
  };

  const handleVerify = async (share: Share) => {
    const xi = BigInt(share.x);
    console.log('share', share);
    const cipherBuf = decodeCiphertext(share.ciphertext);
    const plainBuf = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privKeyRef.current!,
      cipherBuf
    );

    const hex = new TextDecoder().decode(plainBuf).replace(/^0x/i, "");

    const yi = BigInt(hex);
    console.log('share2', xi, yi, share.session.p, share.session.q, share.session.g, share.session.commitments);
    const ok = verifyShare([xi, yi], BigInt(share.session.p),  
                                     BigInt(share.session.g), 
                                     share.session.commitments.map(c => BigInt(c)),
                                     BigInt(share.session.q));
    console.log('share2', xi, yi);
    alert(ok ? "Доля валидна ✅" : "Неверная доля ❌");
  };

  const handleDelete = async (shareId: number, x: string) => {
    if (!confirm(`Удалить долю x=${x}?`)) return;
    const res = await fetch(`/api/me/shares/${shareId}`, { method: "DELETE" });
    if (!res.ok) return alert(`Ошибка удаления: ${res.status}`);
    setShares(shares => shares.filter(s => s.id !== shareId));
  };

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Мои доли</h1>
      <p className="text-sm text-gray-600">
        Здесь отображаются ваши сохранённые доли секрета.
      </p>

      <Card>
        <CardHeader title="Список долей" />
        <CardContent>
          {loading && <p>Загрузка долей...</p>}
          {error && <p className="text-red-500">Ошибка: {error}</p>}

          {!loading && !error && (
            <ScrollArea className="h-80">
              {shares.length > 0 ? (
                <div className="divide-y">
                  {shares.map((share) => {
                    const createdDate = new Date(share.createdAt);
                    const createdDisplay = isValid(createdDate)
                      ? format(createdDate, "yyyy-MM-dd HH:mm")
                      : "-";

                    const expDate = share.expiresAt ? new Date(share.expiresAt) : null;
                    const expiresDisplay = expDate && isValid(expDate)
                      ? format(expDate, "yyyy-MM-dd HH:mm")
                      : "∞";

                    return (
                      <div
                        key={share.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">x =</span>
                            <code className="font-mono bg-gray-100 px-1 rounded">
                              {share.x}
                            </code>
                            {renderStatus(share.status)}
                          </div>
                          <Tooltip content={share.ciphertext.join(", ")}>
                            <p className="text-xs text-gray-600">
                              Шифротекст:{" "}
                              <code className="font-mono">
                                {share.ciphertext
                                  .slice(0, 6)
                                  .map((b) => b.toString(16).padStart(2, "0"))
                                  .join("")}
                                …
                              </code>
                            </p>
                          </Tooltip>
                          {share.comment && (
                            <p className="text-sm text-gray-700">
                              Комментарий: <em>{share.comment}</em>
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Алгоритм: {share.encryptionAlgorithm}
                          </p>
                        </div>
                        <div className="mt-4 sm:mt-0 flex flex-col items-end space-y-2">
                          <div className="text-xs text-gray-500">
                            <p>Создано: {createdDisplay}</p>
                            <p>Истекает: {expiresDisplay}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" onClick={() => handleVerify(share)}>
                              Проверить
                            </Button>
                            <Button variant="secondary" onClick={() => handleVerify(share)}>
                              Удалить
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Долей пока нет или вы не залогинены.
                </p>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
