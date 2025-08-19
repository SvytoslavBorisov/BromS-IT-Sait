"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { InfoRow, ProfileHeader, type Me } from "./ProfileInfo";
import ProfileLogs from "./ProfileLogs";
import { Button } from "@/components/ui/button";
import TelegramLoginButtonClient from "@/components/integrations/TelegramLoginButton.client";

export default function ProfileDetails() {
  const { data: session, status } = useSession();

  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  // Загрузка профиля
  useEffect(() => {
    if (status !== "authenticated") return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setMeLoading(true);
        setMeError(null);
        const res = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Me = await res.json();
        setMe(data);
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setMeError(e?.message ?? "Не удалось загрузить профиль");
      } finally {
        setMeLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [status]);

  if (status === "loading") return <p className="px-6 py-6">Загрузка…</p>;

  // объединяем session.user и данные из API
  const user: any = useMemo(
    () => ({ ...(session?.user ?? {}), ...(me ?? {}) }),
    [session?.user, me]
  );

  const name = user.name ?? "";
  const surname = user.surname ?? "";
  const fullName = [name, surname].filter(Boolean).join(" ") || "Без имени";
  const bannerUrl: string | undefined = user.banner || user.cover || undefined;

  // === Обработчик выбора аватара ===
  const onAvatarPick = async (file: File) => {
    setAvatarErr(null);
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/me/avatar", {
      method: "POST",
      body: fd,
      credentials: "include",
    });

    if (!res.ok) throw new Error(`Ошибка загрузки (${res.status})`);

    const data = await res.json();
    const newUrl: string | undefined = data.image ?? data.url ?? data.avatar;
    if (!newUrl) throw new Error("Сервер не вернул ссылку на изображение");

    setMe((prev) => ({ ...(prev ?? {}), image: newUrl }));
  };

  const botUsername = process.env.NEXT_PUBLIC_TG_BOT_USERNAME!;

  return (
    <section className="w-full">
      <div className="mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        {/* ЛЕВАЯ: ПРОФИЛЬ */}
        <div className="col-span-12 lg:col-span-8">
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            {/* Шапка */}
            <ProfileHeader
              fullName={fullName}
              name={name}
              surname={surname}
              bannerUrl={bannerUrl}
              imageUrl={user.image}
              onAvatarPick={onAvatarPick}
            />

            {/* Контент профиля */}
            <div className="px-6 pt-16 pb-6 sm:px-8">
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                {fullName}
              </h1>
              <p className="mt-1 text-gray-500">
                {user.username ? `@${user.username}` : user.email || "—"}
              </p>

              {meLoading && (
                <p className="mt-4 text-sm text-gray-500">
                  Обновляем данные профиля…
                </p>
              )}
              {meError && (
                <p className="mt-4 text-sm text-red-600">Ошибка: {meError}</p>
              )}
              {avatarErr && (
                <p className="mt-3 text-sm text-rose-600">Ошибка: {avatarErr}</p>
              )}

              <div className="mt-6 grid grid-cols-1 gap-2">
                <InfoRow
                  label="E-mail"
                  value={user.email}
                  href={user.email ? `mailto:${user.email}` : undefined}
                />
                <InfoRow label="Компания" value={me?.company?.title} />
                <InfoRow label="Отдел" value={me?.department?.title} />
                <InfoRow label="Должность" value={me?.position?.title} />
                <InfoRow
                  label="Телефон"
                  value={user.phone}
                  href={user.phone ? `tel:${user.phone}` : undefined}
                />
                <InfoRow label="Локация" value={user.location} />
              </div>

              {/* === КРАСИВАЯ КНОПКА Telegram === */}
              <div className="mt-8 flex">
                {user.telegramId ? (
                  <Button
                    variant="secondary"
                    className="rounded-xl bg-green-50 text-green-700 hover:bg-green-100"
                  >
                    ✅ Аккаунт Telegram привязан
                  </Button>
                ) : (
                  <div className="w-full">
                    <TelegramLoginButtonClient
                      botUsername={botUsername} // замените на реальное имя бота
                      size="large"
                      cornerRadius={12}
                      requestAccessWrite={true}
                      refreshAfterLink={true}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ПРАВАЯ: МОИ ЛОГИ */}
        <ProfileLogs />
      </div>
    </section>
  );
}
