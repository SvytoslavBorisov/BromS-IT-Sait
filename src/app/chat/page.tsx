// app/chat/page.tsx
"use client";

import { useSession } from "next-auth/react";
import Chat from "@/components/Chat";

export default function ChatPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="p-4 text-center text-gray-500">Загрузка...</div>;
  }
  if (status === "unauthenticated") {
    return <div className="p-4 text-center text-red-500">Нужно войти в систему</div>;
  }

  const userName = session?.user?.name || session?.user?.email || "Аноним";
  const userAvatar = session?.user?.image || undefined;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Chat
        room="global"
        user={userName}
        // если хочешь — прокинь и аватар
        // avatar={userAvatar}
      />
    </div>
  );
}
