"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials, formatBytes, toPublicHref } from "./utils";
import type { SignatureRow, VerifyResult } from "./types";
import React from "react";

export function SignRow({
  r,
  onVerifiedStart,
  verifyingId,
}: {
  r: SignatureRow;
  verifyingId: string | null;
  onVerifiedStart: (id: string) => Promise<void>;
}) {
  return (
    <div className="group border-t border-border/60 hover:bg-muted/40 transition-colors">
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
                <a href={toPublicHref(r.filePath)} download>Скачать</a>
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
              onClick={() => onVerifiedStart(r.id)}
              disabled={verifyingId === r.id}
              className="rounded-xl shadow-sm"
            >
              {verifyingId === r.id ? "Проверяю…" : "Проверить"}
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
