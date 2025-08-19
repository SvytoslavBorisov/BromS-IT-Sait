"use client";

import React from "react";
import SessionCard, { SessionSummary } from "./SessionCard";

export default function SessionsGrid({
  sessions,
  onRecover,
  onDetails,
}: {
  sessions: SessionSummary[];
  onRecover: (id: string) => void;
  onDetails?: (id: string) => void;
}) {
  if (!sessions?.length) {
    return (
      <div className="rounded-2xl border shadow-sm p-10 text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl border flex items-center justify-center">
          <span className="text-base font-semibold">∑</span>
        </div>
        <h2 className="mt-3 text-lg font-medium">Нет активных сессий</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Создайте новую сессию, чтобы поделить секрет и затем восстановить его при достижении порога.
        </p>
      </div>
    );
  }

  return (
    <div>
      {sessions.map(s => (
        <SessionCard
          key={s.id}
          item={s}
          onRecover={onRecover}
          onDetails={onDetails}
        />
      ))}
    </div>
  );
}
