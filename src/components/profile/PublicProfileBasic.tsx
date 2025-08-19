"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";

type BasicUser = {
  id: string;
  name?: string;
  surname?: string;
  email?: string;
  image?: string;
  company?: { id: string; title: string } | null;
  department?: { id: string; title: string } | null;
  position?: { id: string; title: string } | null;
  location?: string | null;
};

export default function PublicProfileBasic({ userId }: { userId: string }) {
  const [user, setUser] = useState<BasicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/users/${encodeURIComponent(userId)}?view=basic`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: BasicUser) => {
        setUser(data);
        setErr(null);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <Card className="mx-auto max-w-3xl mt-6">
      <CardHeader title="Профиль пользователя" />
      <CardContent>
        {loading && <div className="text-sm text-muted-foreground">Загрузка…</div>}
        {err && <div className="text-sm text-red-500">Ошибка: {err}</div>}
        {!loading && !err && user && (
          <div className="flex gap-6 items-start">
            <div className="relative h-20 w-20 rounded-2xl overflow-hidden ring-1 ring-border bg-muted">
              {user.image ? (
                <Image src={user.image} alt={user.name ?? "avatar"} fill className="object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xl">
                  {(user.name?.[0] ?? "U").toUpperCase()}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="text-xl font-semibold">
                {user.name} {user.surname}
              </div>
              <div className="text-sm text-muted-foreground">{user.email}</div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {user.company?.title && (
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <div className="text-xs text-muted-foreground">Компания</div>
                    <div className="font-medium">{user.company.title}</div>
                  </div>
                )}
                {user.department?.title && (
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <div className="text-xs text-muted-foreground">Отдел</div>
                    <div className="font-medium">{user.department.title}</div>
                  </div>
                )}
                {user.position?.title && (
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <div className="text-xs text-muted-foreground">Должность</div>
                    <div className="font-medium">{user.position.title}</div>
                  </div>
                )}
                {user.location && (
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <div className="text-xs text-muted-foreground">Локация</div>
                    <div className="font-medium">{user.location}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}