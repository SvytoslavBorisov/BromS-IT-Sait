"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";  // ← берем useSession
import Sidebar from "@/components/profile/Sidebar";
import ProfileDetails from "@/components/profile/ProfileDetails";
import Settings from "@/components/profile/Settings";
import Security from "@/components/profile/Logs";
import MyShares from "@/components/profile/Shares";
import ProfileProcesses from "@/components/profile/Process";
import RecoverList from "@/components/profile/RecoverList";
import { clearPrivateJwk } from "@/lib/crypto/secure-storage";
import { Badge } from '@/components/ui/badge_notif';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter, useSearchParams } from "next/navigation";


type Tab = 
  | "profile"
  | "keys"
  | "all_keys"
  | "process"
  | "security"
  | "settings";


export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const notifs = useNotifications();
  const unreadCount = notifs.filter(n => !n.isRead).length;

  const searchParams = useSearchParams();
  // читаем tab из URL, либо дефолтим на "profile"
  const paramTab = searchParams.get("tab") as Tab | null;
  const initialTab: Tab = paramTab ?? "profile";

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // синхронизируем state → URL
  const handleSelectTab = (tab: Tab) => {
    setActiveTab(tab);
    // В App Router просто push без shallow
    router.push(`/profile?tab=${tab}`);
  };

  // 4. Если кто-то пришёл по прямому URL с ?tab=, обновляем state
  useEffect(() => {
    if (paramTab && paramTab !== activeTab) {
      setActiveTab(paramTab);
    }
  }, [paramTab, activeTab]);

  // Если сессии ещё нет или нет пользователя — можно показывать лоадер или редирект
  if (status === "loading") {
    return <div>Загрузка...</div>;
  }
  if (status === "unauthenticated" || !session?.user?.id) {
    // Можно редирект на логин
    signOut({ callbackUrl: "/auth/login" });
    return null;
  }

  // handler для кнопки выхода
  const handleLogout = async () => {
    try {
      // 1) Очистить приватный ключ для текущего пользователя
      //await clearPrivateJwk(session.user.id);
    } catch (e) {
      console.error("Ошибка при очистке privateJwk:", e);
    } finally {
      // 2) Выйти из сессии и отправить на страницу логина
      signOut({ callbackUrl: "/auth/login" });
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      
      <Sidebar activeTab={activeTab} setActiveTab={handleSelectTab} />
      <Badge count={unreadCount} />
      <main className="flex-1 p-8">
        {/* Кнопка выхода */}
        <div className="flex justify-end mb-6">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Выйти
          </button>
        </div>

        {activeTab === "profile"  && <ProfileDetails />}
        {activeTab === "keys"     && <MyShares />}
        {activeTab === "all_keys" && <RecoverList />}
        {activeTab === "process"  && <ProfileProcesses />}
        {activeTab === "security" && <Security />}
        {activeTab === "settings" && <Settings />}
       
      </main>
    </div>
  );
}
