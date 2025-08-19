"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export type Maybe<T> = T | undefined | null;

export type Me = {
  name?: string;
  surname?: string;
  email?: string;
  image?: string;
  banner?: string;
  cover?: string;
  phone?: string;
  location?: string;
  company?: { id: string; title: string };
  department?: { id: string; title: string };
  position?: { id: string; title: string };
};

export function initials(name?: string, surname?: string) {
  const a = (name?.[0] ?? "").toUpperCase();
  const b = (surname?.[0] ?? "").toUpperCase();
  return (a + b) || "U";
}

export function InfoRow({
  label,
  value,
  href,
}: {
  label: string;
  value: Maybe<string>;
  href?: string;
}) {
  if (!value) return null;
  const content = href ? (
    <a href={href} className="text-blue-600 hover:underline break-all">
      {value}
    </a>
  ) : (
    <span className="text-gray-900 break-words">{value}</span>
  );
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-1.5">
      <div className="w-36 shrink-0 text-gray-500">{label}</div>
      {content}
    </div>
  );
}

/** Баннер + аватар с возможностью смены фото */
export function ProfileHeader({
  fullName,
  name,
  surname,
  bannerUrl,
  imageUrl,
  onAvatarPick,     // ← коллбэк загрузки
}: {
  fullName: string;
  name?: string;
  surname?: string;
  bannerUrl?: string;
  imageUrl?: string;
  onAvatarPick?: (file: File) => Promise<void> | void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = () => fileRef.current?.click();

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // простая валидация
    const okType = /^image\/(png|jpe?g|webp|avif)$/i.test(f.type);
    const maxMB = 5;
    const okSize = f.size <= maxMB * 1024 * 1024;

    if (!okType) {
      setError("Допустимы PNG/JPG/WebP/AVIF");
      e.target.value = ""; // сброс
      return;
    }
    if (!okSize) {
      setError(`Файл больше ${maxMB} МБ`);
      e.target.value = "";
      return;
    }

    setError(null);
    if (!onAvatarPick) return;

    try {
      setUploading(true);
      await onAvatarPick(f);
    } catch (err: any) {
      setError(err?.message ?? "Не удалось загрузить фото");
    } finally {
      setUploading(false);
      e.target.value = ""; // разрешить выбрать тот же файл снова
    }
  };

  return (
    <div className="relative h-40 sm:h-56 bg-gradient-to-r from-sky-500 to-blue-600">
      {bannerUrl && (
        <Image
          src={bannerUrl}
          alt="Banner"
          fill
          className="object-cover opacity-90"
        />
      )}

      {/* Аватар */}
      <div className="absolute -bottom-14 left-6 z-10">
        <button
          type="button"
          onClick={openPicker}
          className="group relative h-28 w-28 rounded-full ring-4 ring-white overflow-hidden bg-gray-100 flex items-center justify-center text-2xl font-semibold text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Изменить фото профиля"
          title="Изменить фото"
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={fullName}
              width={112}
              height={112}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initials(name, surname)}</span>
          )}

          {/* Hover/Uploading overlay */}
          <div
            className={[
              "absolute inset-0 grid place-items-center text-white text-xs font-medium",
              "bg-black/0 group-hover:bg-black/40 transition-colors",
              uploading ? "bg-black/50" : "",
            ].join(" ")}
          >
            {uploading ? "Загрузка…" : <span className="opacity-0 group-hover:opacity-100 transition-opacity">Сменить</span>}
          </div>
        </button>

        {/* скрытый input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={handlePick}
        />

        {error && (
          <div className="mt-2 text-xs text-rose-600">{error}</div>
        )}
      </div>
    </div>
  );
}
