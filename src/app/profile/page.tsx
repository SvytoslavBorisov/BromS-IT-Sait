"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import Sidebar from "@/components/profile/Sidebar";
import { type Tab, type SubtabId } from "@/components/profile/nav";
import ProfileDetails   from "@/components/profile/ProfileDetails";
import Settings         from "@/components/profile/Settings";
import Security         from "@/components/profile/Logs";
import MyShares         from "@/components/profile/Shares";
import ProfileProcesses from "@/components/profile/Process";
import RecoverList      from "@/components/profile/RecoverList";
import CreateShares      from "@/components/CreateShares";
import DocumentsPage    from "@/components/profile/Documents";
import { Badge } from "@/components/ui/badge_notif";
import { useNotifications } from "@/hooks/useNotifications";
import { Dispatch, SetStateAction } from "react";

const DEFAULT_SUBTAB: Partial<Record<Tab, SubtabId>> = {
  keys: "keys.list",
  storage: "storage.keys",
  process: "process.active",
  settings: "settings.profile",
};

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const notifs = useNotifications();
  const unreadCount = notifs.filter(n => !n.isRead).length;

  const sp = useSearchParams();
  const activeTab = (sp?.get("tab") || "profile") as Tab;
  const activeSubtab = sp?.get("sub") as SubtabId | null;

  // редирект неавторизованных — только в эффекте
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
    }
  }, [status, router]);

  // если у текущей вкладки есть дефолтная подвкладка, а ?sub нет — допишем в URL
  useEffect(() => {
    const def = DEFAULT_SUBTAB[activeTab] ?? null;
    if (def && !activeSubtab?.startsWith(`${activeTab}.`)) {
      const q = new URLSearchParams();
      q.set("tab", activeTab);
      q.set("sub", def);
      router.replace(`/profile?${q.toString()}`);
    }
  }, [activeTab, activeSubtab, router]);

  // Хендлеры просто меняют URL — НИКАКОГО локального setState
  const DEFAULT_SUBTAB: Partial<Record<Tab, SubtabId>> = {
    keys: "keys.list",
    storage: "storage.keys",
    process: "process.active",
    settings: "settings.profile",
  };

  const selectTab = (tab: Tab) => {
    const def = DEFAULT_SUBTAB[tab] ?? null;
    const q = new URLSearchParams();
    console.log(q, tab)
    q.set("tab", tab);
    if (def) q.set("sub", def);
    router.push(`/profile?${q.toString()}`);
  };

  const selectSubtab = (value: SubtabId | null) => {
    const q = new URLSearchParams();
    q.set("tab", activeTab);
    if (value) q.set("sub", value);
    router.push(`/profile?${q.toString()}`);
  };


  // обёртка с сигнатурой React-сеттера
  const setActiveSubtabDispatch: Dispatch<SetStateAction<SubtabId | null>> = (v) => {
    const next = typeof v === "function" ? v(activeSubtab) : v; // берём текущий из URL
    selectSubtab(next);
  };
  
  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileDetails />;

      case "keys":
        switch (activeSubtab) {
          case "keys.list":
          default:
            return <MyShares />;
          case "keys.create":
            return <CreateShares />;
          case "keys.import":
            return <div>Здесь импорт ключа</div>;
        }

      case "storage":
        switch (activeSubtab) {
          case "storage.keys":
            return <RecoverList />;
          case "storage.shares":
            return <MyShares />;
          case "storage.certs":
            return <div>Здесь будут все ваши сертификаты</div>;
          case "storage.docs":
            return <DocumentsPage />;
          default:
            return <RecoverList />;
          
        }

      case "process":
        switch (activeSubtab) {
          case "process.active":
          default:
            return <ProfileProcesses />;
          case "process.history":
            return <div>История процессов</div>;
        }

      case "security":
        return <Security />;

      case "settings":
        switch (activeSubtab) {
          case "settings.profile":
          default:
            return <Settings />;
          case "settings.notifications":
            return <div>Настройки уведомлений</div>;
          case "settings.access":
            return <div>Управление доступом</div>;
        }
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={selectTab}
        activeSubtab={activeSubtab}
        setActiveSubtab={setActiveSubtabDispatch}
      />
        <div className="flex-1 ml-16">
          <div className="absolute right-0 justify-between items-center mb-6 z-1">
            <Badge count={unreadCount} />
            <button
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Выйти
            </button>
          </div>

          {isLoading ? <div>Загрузка...</div> : renderContent()}
        </div>
    </div>
  );
}
