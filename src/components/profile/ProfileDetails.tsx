"use client";

import { useSession } from "next-auth/react";
import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";

export default function ProfileDetails() {
  const { data: session, status } = useSession();
  if (status === "loading") return <p>Загрузка...</p>;
  const user = session?.user || {};

  // Массив полей — легко добавлять новые
  const profileFields = [
    { label: "Имя", value: user.firstName || "-" },
    { label: "Фамилия", value: user.lastName || "-" },
    { label: "Должность", value: user.position || "-" },
    { label: "Отдел", value: user.department || "-" },
    { label: "Номер телефона", value: user.phone || "-" },
    { label: "Почта", value: user.email || "-" },
    // Для добавления нового поля достаточно дописать здесь
  ];

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Добро пожаловать, {user.firstName}!</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader title="Ваши данные" />
          <CardContent>
            {profileFields.map(({ label, value }) => (
              <p key={label} className="mb-2">
                <span className="font-medium">{label}:</span> {value}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Активность" />
          <CardContent>
            <p>Последний вход: {new Date(user.lastLogin).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p>Всего операций: {user.activityCount}</p>
            <Button variant="secondary" className="mt-4">
              Просмотреть
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Безопасность" />
          <CardContent>
            <p>Ключ шифрования: <code>••••••••••••</code></p>
            <Button variant="outline" className="mt-4">
              Обновить ключ
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}