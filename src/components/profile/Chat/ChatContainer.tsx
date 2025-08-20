// components/chat/ChatContainer.tsx
"use client";

import { useSession } from "next-auth/react";
import BeautifulChat from "@/components/profile/Chat/BeautifulChat"; // твой компонент чата
import React from "react";

type Props = {
  room?: string;
  className?: string;
  // как вести себя, если не авторизован: "inline" — показать компактный алерт, "blank" — ничего
  unauthMode?: "inline" | "blank";
};

export default function ChatContainer({
  room = "global",
  className = "",
  unauthMode = "inline",
}: Props) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse h-10 w-40 bg-gray-200 rounded mb-4" />
        <div className="animate-pulse h-64 bg-gray-200/70 rounded-2xl" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    if (unauthMode === "blank") return null;
    return (
      <div className={`p-4 ${className}`}>
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          Нужно войти в систему, чтобы пользоваться чатом.
        </div>
      </div>
    );
  }

  const userName = session?.user?.name || session?.user?.email || "Аноним";
  const userAvatar = session?.user?.image || undefined;

  return (
    <div className={className}>
      <BeautifulChat room={room} user={userName} avatar={userAvatar} />
    </div>
  );
}
