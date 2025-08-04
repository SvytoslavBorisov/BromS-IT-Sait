"use client";

import { useEffect, useState } from "react";
import RecoverSecret from "./RecoverSecret";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";

interface SessionInfo {
  id: string;
  createdAt: string;
  threshold: number;
}

export default function RecoverList() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);

  const router = useRouter();
  useEffect(() => {
    fetch("/api/shares/sessions")
      .then((r) => r.json())
      .then(setSessions)
      .catch(console.error);
  }, []);

  if (!sessions.length) {
    return (
      <Card>
        <CardHeader title="Выберите сессию для восстановления" />
        <CardContent>
          <p>Нет активных сессий разделения</p>
          <Button
            onClick={() => router.push("/profile/create_shares")}
          >
            Создать новую сессию
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Выберите сессию для восстановления" />
        <CardContent>
          {<RecoverSecret />}
        </CardContent>
    </Card>
  );
}