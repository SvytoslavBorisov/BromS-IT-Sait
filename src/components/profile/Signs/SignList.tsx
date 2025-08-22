"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/cards";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SignRow } from "./SignRow";
import type { SignatureRow } from "./types";

export function SignList({
  rows,
  loading,
  verifyingId,
  onVerifiedStart,
}: {
  rows: SignatureRow[];
  loading: boolean;
  verifyingId: string | null;
  onVerifiedStart: (id: string) => Promise<void>;
}) {
  return (
    <Card className="border-0 shadow-lg rounded-2xl">
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-lg font-medium">Все подписи</div>
          <Badge variant="secondary">{rows.length}</Badge>
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

            {!loading && rows.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Ничего не найдено.
              </div>
            )}

            {!loading && rows.map((r) => (
              <SignRow
                key={r.id}
                r={r}
                verifyingId={verifyingId}
                onVerifiedStart={onVerifiedStart}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
