"use client";

import { useEffect, useState } from "react";
import RecoverSecret from "./RecoverSecret";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";

interface SessionInfo {
  id: string;
  createdAt: string;
  threshold: number;
}

export default function RecoverList() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/shares/sessions")
      .then((r) => r.json())
      .then(setSessions)
      .catch(console.error);
  }, []);

  if (!sessions.length) {
    return <p>Нет активных сессий разделения.</p>;
  }

  return (
    <Card>
      <CardHeader title="Выберите сессию для восстановления" /><CardContent>
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id}>
              <Button variant="outline" onClick={() => setSelectedSession(s.id)}>
                Сессия {s.id} от {new Date(s.createdAt).toLocaleString()}, порог {s.threshold}
              </Button>
            </li>
          ))}
        </ul>
        {selectedSession && <RecoverSecret sessionId={selectedSession} />}
      </CardContent>
    </Card>
  );
}