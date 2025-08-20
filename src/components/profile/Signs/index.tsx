"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type SignatureRow = {
  id: string;
  type: string;
  filePath?: string | null;
  pem?: string | null;

  documentId: string;
  document: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  };

  userId: string;
  user: {
    id: string;
    name?: string | null;
    surname?: string | null;
    email: string;
    image?: string | null;
  };

  shamirSessionId?: string | null;
};

type VerifyResult = {
  ok: boolean;
  status: "OK" | "WARN" | "ERROR" | "NOT_IMPLEMENTED";
  message: string;
  details?: Record<string, any>;
};

function initials(name?: string | null, surname?: string | null) {
  const a = (name?.[0] ?? "").toUpperCase();
  const b = (surname?.[0] ?? "").toUpperCase();
  return (a + b) || "U";
}

function formatBytes(b: number) {
  if (!Number.isFinite(b)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (b >= 1024 && i < units.length - 1) {
    b /= 1024;
    i++;
  }
  return `${b.toFixed(1)} ${units[i]}`;
}

export default function SignsPage() {
  const { status } = useSession();
  const [rows, setRows] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [q, setQ] = useState("");

useEffect(() => {
  if (status !== "authenticated") return;

  const ctrl = new AbortController();
  let cancelled = false;

  (async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/signatures", {
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as SignatureRow[];

      if (cancelled || ctrl.signal.aborted) return; // не трогаем состояние после abort
      setRows(data);
    } catch (e: any) {
      // AbortError = нормальный сценарий при cleanup — молча выходим
      if (e?.name === "AbortError" || e?.code === 20) return;
      console.error(e);
    } finally {
      if (!cancelled && !ctrl.signal.aborted) setLoading(false);
    }
  })();

  return () => {
    cancelled = true;
    ctrl.abort();
  };
}, [status]);
  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const k = q.trim().toLowerCase();
    return rows.filter((r) =>
      [
        r.id,
        r.type,
        r.document?.fileName,
        r.document?.fileType,
        r.user?.email,
        r.user?.name,
        r.user?.surname,
        r.shamirSessionId ?? "",
      ]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(k))
    );
  }, [rows, q]);

  async function onVerify(id: string) {
    try {
      setVerifyingId(id);
      const res = await fetch(`/api/signatures/${id}/verify`, { method: "POST" });
      const data = (await res.json()) as VerifyResult;
      const tone =
        data.status === "OK" ? "✅" :
        data.status === "WARN" ? "🟡" :
        data.status === "NOT_IMPLEMENTED" ? "🧪" : "⛔";
      alert(`${tone} ${data.message}`);
    } catch (e: any) {
      alert(`⛔ Ошибка проверки: ${e?.message ?? e}`);
    } finally {
      setVerifyingId(null);
    }
  }

function toPublicHref(p?: string | null) {
  if (!p) return "#";
  // нормализуем слэши и вырезаем "public/"
  const u = p.replace(/\\/g, "/");
  // достаём всё после /public/
  const m = u.match(/(?:^|\/)public\/(.+)$/);
  if (m) return "/" + m[1];              // => "/uploads/....sig"
  // если уже нормальный публичный путь — вернём с ведущим слэшем
  return u.startsWith("/") ? u : "/" + u;
}

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Подписи</h1>
        <div className="ml-auto w-full md:w-80">
          <Input
            placeholder="Поиск: файл, e‑mail, тип, ID…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-0 shadow-lg rounded-2xl">
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium">Все подписи</div>
            <Badge variant="secondary">{filtered.length}</Badge>
          </div>
        </CardContent>
        <CardContent>
          <ScrollArea className="max-h-[70vh]">
            <div className="min-w-[820px]">
              <div className="grid grid-cols-[2.2fr_1.2fr_1.5fr_1fr_auto] px-6 pb-3 text-xs uppercase tracking-wider text-muted-foreground">
                <div>Документ</div>
                <div>Тип</div>
                <div>Пользователь</div>
                <div>Сессия</div>
                <div className="text-right pr-2">Действия</div>
              </div>

              {loading && (
                <div className="px-6 py-8 text-sm text-muted-foreground">Загрузка…</div>
              )}

              {!loading && filtered.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Ничего не найдено.
                </div>
              )}

              {!loading && filtered.map((r) => (
                <div
                  key={r.id}
                  className="group border-t border-border/60 hover:bg-muted/40 transition-colors"
                >
                  <div className="grid grid-cols-[2.2fr_1.2fr_1.5fr_1fr_auto] items-center gap-4 px-6 py-4">
                    {/* Документ */}
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="flex flex-col overflow-hidden">
                        <div className="font-medium truncate">{r.document.fileName}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.document.fileType} · {formatBytes(r.document.fileSize)}
                        </div>
                        <div className="text-[11px] text-muted-foreground/80 mt-1">
                          Sig ID: <span className="font-mono">{r.id}</span>
                        </div>
                        {r.filePath ? (
                          <div className="mt-1">
                            <Badge variant="outline" className="font-mono text-[11px]">file</Badge>
                            <span className="ml-2 text-[11px] text-muted-foreground break-all">
                              {r.filePath}
                            </span>
                          </div>
                        ) : r.pem ? (
                          <div className="mt-1">
                            <Badge variant="outline" className="font-mono text-[11px]">PEM</Badge>
                            <span className="ml-2 text-[11px] text-muted-foreground">в модели</span>
                          </div>
                        ) : (
                          <div className="mt-1 text-[11px] text-red-500">нет носителя подписи</div>
                        )}
                      </div>
                    </div>

                    {/* Тип */}
                    <div>
                      <Badge className="rounded-xl">{r.type}</Badge>
                    </div>

                    {/* Пользователь */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 ring-1 ring-border/70">
                        {r.user?.image ? (
                          <AvatarImage src={r.user.image} alt={r.user.email} />
                        ) : (
                          <AvatarFallback>
                            {initials(r.user?.name, r.user?.surname)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate">
                          {(r.user?.name || r.user?.surname)
                            ? `${r.user?.surname ?? ""} ${r.user?.name ?? ""}`.trim()
                            : r.user?.email}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {r.user?.email}
                        </div>
                      </div>
                    </div>

                    {/* Сессия */}
                    <div className="text-sm">
                      {r.shamirSessionId
                        ? <span className="font-mono">{r.shamirSessionId}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </div>

                    {/* Действия */}
                    <div className="flex items-center justify-end gap-2">
                      {r.filePath && (
                        <Tooltip content="Скачать подпись‑файл">
                          <Button className="opacity-80 group-hover:opacity-100">
                            <a href={toPublicHref(r.filePath)} download>
                              Скачать
                            </a>
                          </Button>
                        </Tooltip>
                      )}

                      {r.pem && (
                        <Tooltip content="Скачать PEM">
                          <Button
                            onClick={() => {
                              const blob = new Blob([r.pem ?? ""], { type: "application/x-pem-file" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `${r.document.fileName}.pem`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="opacity-80 group-hover:opacity-100"
                          >
                            PEM
                          </Button>
                        </Tooltip>
                      )}

                      <Tooltip content="Проверить подпись">
                        <Button
                          onClick={() => onVerify(r.id)}
                          disabled={verifyingId === r.id}
                          className="rounded-xl shadow-sm"
                        >
                          {verifyingId === r.id ? "Проверяю…" : "Проверить"}
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
