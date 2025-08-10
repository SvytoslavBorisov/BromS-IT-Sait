"use client";
import { useState } from "react";
import { ShareSession } from "./types";

export function useShareSessions() {
  const [sessions, setSessions] = useState<ShareSession[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchSessions() {
    setLoading(true);
    try {
      const res = await fetch("/api/shareSessions");
      if (!res.ok) throw new Error("Не удалось загрузить сессии");
      const data: ShareSession[] = await res.json();

      console.log('res', data);

      setSessions(data);
    } finally {
      setLoading(false);
    }
  }

  return { sessions, loading, fetchSessions };
}
