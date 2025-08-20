"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import { loadPrivateJwk } from "@/lib/crypto/secure-storage";
import { decodeCiphertext } from "@/lib/crypto/keys";
import { jwkFingerprint } from "@/lib/crypto/fingerprint";

interface ShareRequest {
  id:         string;   // recoveryId
  x:          string;   // координата
  dealerId:   string;
  status:     string
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
      // a) приватный ключ пользователя
      const privJwk = await loadPrivateJwk(session.user.id);
      if (!privJwk) throw new Error("Приватный ключ не найден");
      const privKey = await crypto.subtle.importKey(
        "jwk",
        privJwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"]
      );

      // b) расшифровка пришедшего ciphertext
      const cipherBytes = decodeCiphertext(req.ciphertext);
      const bytes = new Uint8Array(cipherBytes);
      const plainBuf    = await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privKey,
        bytes
      );

      // c) публичный ключ дилера
      const pubRes = await fetch(`/api/users/${req.dealerId}/pubkey`);
      const { jwk: dealerJwk } = await pubRes.json();
      const dealerKey = await crypto.subtle.importKey(
        "jwk", dealerJwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false, ["encrypt"]
      );

      // d) шифруем буфер ключом дилера
      const newCtBuf = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        dealerKey,
        plainBuf
      );

      // e) Uint8Array → number[] → base64-строка → массив символов (как у вас)
      const newCtArr = Array.from(new Uint8Array(newCtBuf));
      let bin = "";
      for (let i = 0; i < newCtArr.length; i++) bin += String.fromCharCode(newCtArr[i]);
      const b64 = btoa(bin);
      const charArr = b64.split("");
      const json = JSON.stringify(charArr);

      const putRes = await fetch(`/api/recovery/${req.id}/receipt`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ciphertext: json }),
      });
      if (!putRes.ok) {
        const err = await putRes.json();
        throw new Error(err.error || putRes.statusText);
      }

      // f) убираем выполненный запрос
      setRequests((rs) => rs.filter((r) => r.id !== req.id));
    }
    catch (e: any) {
      console.log("Тута", e);
      setError(e.message);
    }
  };

  if (status === "loading") {
    return <p>Загрузка...</p>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-[50vh] grid place-items-center">
        <p className="text-muted-foreground">Пожалуйста, войдите.</p>
      </div>
    );
  }


  return (
    <div className="relative min-h-[80vh] overflow-hidden">
      <div className="sticky top-0 z-20 bg-white border-b">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-9 w-9 rounded-2xl border flex items-center justify-center shadow-sm">
                <span className="text-sm font-semibold">🔑</span>
              </div>
              <div className="truncate">
                <h1 className="text-lg md:text-xl font-semibold leading-6 truncate">
                  Запросы на отдачу доли
                </h1>
                <p className="text-muted-foreground text-xs md:text-sm">
                  {session?.user?.name
                    ? `Профиль: ${session.user.name}`
                    : "Ваш профиль"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 mt-10">
        <Card
          className="border-white/5 bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.25)] rounded-2xl overflow-hidden"
        >
          <CardHeader
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconInbox />
                  <span className="text-lg font-semibold">Ожидающие запросы</span>
                </div>
                <span className="text-xs md:text-sm text-muted-foreground">
                  {requests.length ? `Всего: ${requests.length}` : "Нет активных запросов"}
                </span>
              </div>
            }
          />
          <CardContent>
            {loading && <SkeletonList count={4} />}

            {!loading && error && (
              <div className="p-4 md:p-6">
                <AlertError message={error} />
              </div>
            )}

            {!loading && !error && (
              <ScrollArea className="max-h-[480px]">
                <ul className="divide-y divide-white/5">
                  {requests.length === 0 ? (
                    <li className="p-8 flex flex-col items-center justify-center text-center">
                      <div className="mb-4">
                        <EmptyIllustration />
                      </div>
                      <p className="text-base font-medium">Нет активных запросов</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Как только дилер запросит вашу долю, она появится здесь.
                      </p>
                    </li>
                  ) : (
                    requests.map((req) => (
                      <li
                        key={req.id}
                        className="group flex items-center justify-between gap-6 p-4 md:p-5 transition-colors hover:bg-white/5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 ring-1 ring-indigo-400/30 text-indigo-300 text-sm">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Zm0 2c-3.315 0-10 1.657-10 4.972V22h20v-3.028C22 15.657 15.315 14 12 14Z" stroke="currentColor" strokeWidth="1.5"/>
                              </svg>
                            </span>
                            <p className="truncate font-medium">
                              Дилер <span className="font-semibold text-foreground/90">{req.dealerId}</span> запрашивает вашу долю x=<span className="font-mono">{req.x}</span>
                            </p>
                          </div>

                          {/* Вторая строка (сохранил вашу информацию отдельно, но красиво оформил) */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <StatusPill status={req.status} />
                            <span className="text-xs text-muted-foreground/90">
                              ID запроса: <span className="font-mono">{req.id}</span>
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Button
                            onClick={() => handleGive(req)}
                            className="transition-all rounded-xl shadow-md hover:shadow-lg active:scale-[.98]"
                          >
                            Отдать долю
                          </Button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- UI helpers (только оформление) ---------------- */

function Header({ sessionName }: { sessionName?: string | null }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 dark:from-white/5 dark:to-white/[0.03] backdrop-blur-xl p-6 md:p-8">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/30 blur-2xl" />
      <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-cyan-400/30 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-white/10 ring-1 ring-white/15 grid place-items-center">
            <svg width="22" height="22" viewBox="0 0 24 24" className="text-white/90">
              <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4Z" fill="currentColor"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Запросы на отдачу доли</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {sessionName ? `Профиль: ${sessionName}` : "Ваш профиль"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 dark:bg-black/30 backdrop-blur-xl p-0 shadow-[0_8px_40px_rgba(0,0,0,0.25)]">
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const palette: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
    rejected: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
    default: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
  };
  const cls = palette[status?.toLowerCase()] ?? palette.default;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current/80" /> {status}
    </span>
  );
}

function AlertError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      <div className="flex items-start gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" className="mt-0.5">
          <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
        <span>Ошибка: {message}</span>
      </div>
    </div>
  );
}

function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <ul className="divide-y divide-white/5">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="p-4 md:p-5">
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-9 w-9 rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-white/10" />
              <div className="h-3 w-1/3 rounded bg-white/10" />
            </div>
            <div className="h-9 w-28 rounded-xl bg-white/10" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyIllustration() {
  return (
    <svg width="88" height="88" viewBox="0 0 120 120" className="opacity-80">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect x="10" y="20" width="100" height="72" rx="14" fill="url(#g)" opacity="0.18" />
      <rect x="18" y="28" width="84" height="12" rx="6" fill="white" opacity="0.18" />
      <rect x="18" y="46" width="64" height="10" rx="5" fill="white" opacity="0.12" />
      <rect x="18" y="62" width="72" height="10" rx="5" fill="white" opacity="0.12" />
      <rect x="18" y="78" width="40" height="10" rx="5" fill="white" opacity="0.12" />
      <circle cx="96" cy="82" r="12" fill="white" opacity="0.16" />
      <path d="M92 82h8" stroke="white" opacity="0.6" strokeWidth="2" strokeLinecap="round"/>
      <path d="M96 78v8" stroke="white" opacity="0.6" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconInbox() {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/30">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 12h4l2 3h6l2-3h4v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 12V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v7" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    </span>
  );
}
