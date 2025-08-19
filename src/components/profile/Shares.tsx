// components/MyShares.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { verifyShare } from "@/lib/crypto/shamir";
import { decodeCiphertext } from "@/lib/crypto/keys";
import { loadPrivateJwk } from "@/lib/crypto/secure-storage";
import {
  CalendarClock,
  Clock,
  KeySquare,
  ShieldCheck,
  Trash2,
  ClipboardCopy
} from "lucide-react";

interface Share {
  id: number;
  x: string;
  ciphertext: number[]; // важно: массив чисел
  status: "ACTIVE" | "USED" | "EXPIRED";
  comment: string;
  encryptionAlgorithm: string;
  createdAt: string;
  expiresAt?: string | null;

  // оставляем ISO-поля, чтобы рисовать "time ago"
  createdAtISO: string;
  expiresAtISO: string | null;

  session: {
    id: string;
    dealerId: string;
    p: string; q: string; g: string;
    commitments: string[];
    threshold: number;
    type: "CUSTOM" | "ASYMMETRIC";
    title?: string | null;
  };
}

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const dt = new Date(iso);
  const diff = Date.now() - dt.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} дн назад`;
}

function StatusBadge({ st }: { st: Share["status"] }) {
  if (st === "ACTIVE")    return <Badge className="rounded-full">active</Badge>;
  if (st === "USED")      return <Badge variant="secondary" className="rounded-full">used</Badge>;
  return <Badge variant="destructive" className="rounded-full">expired</Badge>;
}

export default function MyShares() {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const { status, data: session } = useSession();

  const privKeyRef = useRef<CryptoKey | null>(null);

  // загрузка долей
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me/shares");
        if (!res.ok) throw new Error(`Ошибка ${res.status}`);
        const data: Share[] = await res.json();
        setShares(data);
      } catch (e: any) {
        setError(e.message ?? "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // импорт приватного ключа
  useEffect(() => {
    (async () => {
      try {
        if (status !== "authenticated" || !session?.user?.id) return;
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
  }, [status, session?.user?.id]);

  const copyX = async (x: string) => {
    try { await navigator.clipboard.writeText(x); } catch {}
  };

  // << рабочая версия с чистым ArrayBuffer >>
  const handleVerify = async (share: Share) => {
    try {
      const xi = BigInt(share.x);

      const cipherU8 = decodeCiphertext(share.ciphertext);     // Uint8Array
      const cipherAb = cipherU8.slice().buffer as ArrayBuffer; // даём ArrayBuffer

      const plainBuf = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privKeyRef.current!,
        cipherAb
      );

      const hex = new TextDecoder().decode(plainBuf).replace(/^0x/i, "");
      const yi  = BigInt(hex);

      const ok = verifyShare(
        [xi, yi],
        BigInt(share.session.p),
        BigInt(share.session.g),
        share.session.commitments.map(c => BigInt(c)),
        BigInt(share.session.q)
      );

      alert(ok ? "Доля валидна ✅" : "Неверная доля ❌");
    } catch (e: any) {
      alert("Ошибка верификации: " + (e?.message ?? "OperationError"));
    }
  };

  const handleDelete = async (shareId: number, x: string) => {
    if (!confirm(`Удалить долю x=${x}?`)) return;
    const res = await fetch(`/api/me/shares/${shareId}`, { method: "DELETE" });
    if (!res.ok) return alert(`Ошибка удаления: ${res.status}`);
    setShares(prev => prev.filter(s => s.id !== shareId));
  };

  return (
    <div className="relative">
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-9 w-9 rounded-2xl border flex items-center justify-center shadow-sm">
                <span className="text-sm font-semibold">SSS</span>
              </div>
              <div className="truncate">
                <h1 className="text-lg md:text-xl font-semibold leading-6 truncate">
                  Восстановление секрета
                </h1>
                <p className="text-muted-foreground text-xs md:text-sm">
                  Выберите сессию или начните новую
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    <div className="mx-auto max-w-6xl px-4 md:px-6 py-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader title="Список долей" />
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
                <div className="h-16 rounded-xl bg-muted" />
              </div>
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : shares.length ? (
              <ScrollArea className="h pr-2">
                <div className="grid grid-cols-1 gap-4">
                  {shares.map(share => {
                    const isExpired = !!share.expiresAtISO && new Date(share.expiresAtISO) < new Date();
                    const ctPreview =
                      share.ciphertext
                        .slice(0, 8)
                        .map(b => b.toString(16).padStart(2, "0"))
                        .join("") + (share.ciphertext.length > 8 ? "…" : "");

                    return (
                      <div key={share.id} className="rounded-2xl border shadow-sm p-4 md:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-2xl border flex items-center justify-center">
                                <KeySquare className="h-4 w-4" />
                              </div>
                              <StatusBadge st={isExpired ? "EXPIRED" : share.status} />
                              <Badge variant="outline" className="rounded-full">
                                {share.session.type === "ASYMMETRIC" ? "Asymmetric" : "Custom"}
                              </Badge>
                            </div>

                            <div className="mt-2 text-base font-semibold leading-6 break-all">
                              x = <code className="font-mono">{share.x}</code>
                              <Button
                                variant="outline"
                                className="ml-2 h-7 rounded-xl"
                                onClick={() => copyX(share.x)}
                                aria-label="Скопировать x"
                              >
                                <ClipboardCopy className="h-4 w-4" />
                              </Button>
                            </div>

                            {share.comment && (
                              <div className="mt-1 text-sm text-muted-foreground">
                                Комментарий: <em>{share.comment}</em>
                              </div>
                            )}

                            <div className="mt-2 text-xs text-muted-foreground break-all">
                              Шифротекст: <code className="font-mono">{ctPreview}</code>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <CalendarClock className="h-4 w-4" />
                                <span>получено {timeAgo(share.createdAtISO)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>истекает {share.expiresAtISO ? timeAgo(share.expiresAtISO) : "никогда"}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ShieldCheck className="h-4 w-4" />
                                <span>t = {share.session.threshold}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {/* условный индикатор состояния */}
                            <Progress
                              value={share.status === "USED" ? 100 : (isExpired ? 0 : 60)}
                              className="w-36"
                            />

                            <Button
                              className="rounded-2xl"
                              onClick={() => handleVerify(share)}
                              aria-label="Проверить долю"
                            >
                              Проверить
                            </Button>

                            <Button
                              variant="primary"
                              className="rounded-2xl"
                              onClick={() => handleDelete(share.id, share.x)}
                              aria-label="Удалить долю"
                            >
                              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                                <Trash2 className="h-4 w-4" />
                                Удалить
                              </span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-sm text-muted-foreground">
                Долей пока нет.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
    
  );
}
