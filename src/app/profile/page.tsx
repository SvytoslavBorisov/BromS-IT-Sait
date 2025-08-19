// app/profile/page.tsx (или твой путь)
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import Sidebar from "@/components/profile/Sidebar";
import { type Tab, type SubtabId } from "@/components/profile/nav";

import ProfileDetails     from "@/components/profile/ProfileDetails";
import Settings           from "@/components/profile/Settings";
import Security           from "@/components/profile/Security";
import MyShares           from "@/components/profile/Shares";
import ProfileProcesses   from "@/components/profile/Process";
import RecoverList        from "@/components/profile/RecoverList";
import CreateShares       from "@/components/CreateShares";
import DocumentsPage      from "@/components/profile/Documents";
import CertificatesList   from "@/components/profile/Certificates";

import PublicProfileBasic from "@/components/profile/PublicProfileBasic"; // ← новый компонент

const DEFAULT_SUBTAB: Partial<Record<Tab, SubtabId>> = {
  keys: "keys.list",
  storage: "storage.keys",
  process: "process.active",
  settings: "settings.profile",
};

type Scope = "me" | "all";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const sp = useSearchParams();
  const activeTab = (sp?.get("tab") || "profile") as Tab;
  const activeSubtab = sp?.get("sub") as SubtabId | null;

  // --- Чей профиль смотрим ---
  const qpUserId = sp?.get("userId") || sp?.get("uid") || sp?.get("user") || null;
  const myUserId = (session?.user as any)?.id as string | undefined;
  const viewedUserId = qpUserId ?? myUserId ?? null;
  const isOwn = !!myUserId && !!viewedUserId && myUserId === viewedUserId;

  // редирект неавторизованных — только в эффекте
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
    }
  }, [status, router]);

  // если это мой профиль — как раньше: проставляем дефолтные подвкладки
  useEffect(() => {
    if (!isOwn) return; // для чужого профиля вкладки не нужны
    const def = DEFAULT_SUBTAB[activeTab] ?? null;
    if (def && !activeSubtab?.startsWith(`${activeTab}.`)) {
      const q = new URLSearchParams(sp?.toString());
      q.set("tab", activeTab);
      q.set("sub", def);
      router.replace(`/profile?${q.toString()}`);
    }
  }, [isOwn, activeTab, activeSubtab, router, sp]);

  // Хендлеры меняют URL (для своего профиля)
  const selectTab = (tab: Tab) => {
    if (!isOwn) return; // в гостевом режиме игнорируем
    const def = DEFAULT_SUBTAB[tab] ?? null;
    const q = new URLSearchParams(sp?.toString());
    q.set("tab", tab);
    if (def) q.set("sub", def);
    router.push(`/profile?${q.toString()}`);
  };

  const selectSubtab = (value: SubtabId | null) => {
    if (!isOwn) return; // в гостевом режиме игнорируем
    const q = new URLSearchParams(sp?.toString());
    q.set("tab", activeTab);
    if (value) q.set("sub", value);
    else q.delete("sub");
    router.push(`/profile?${q.toString()}`);
  };

  const renderContent = () => {
    // --- Гостевой режим: всегда базовая инфа пользователя ---
    if (!isOwn && viewedUserId) {
      return <PublicProfileBasic userId={viewedUserId} />;
    }

    // --- Мой профиль: всё как было ---
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
            return <CertificatesList />;
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
      {/* Сайдбар: в гостевом режиме делаем его «узким» и неактивным */}
      <Sidebar
        activeTab={isOwn ? activeTab : "profile"}
        setActiveTab={selectTab}
        activeSubtab={isOwn ? activeSubtab : null}
        setActiveSubtab={selectSubtab as any}
        readOnly={!isOwn}                // ← добавь поддержку этого пропа в Sidebar (disable навигацию)
      />
      <div className="flex-1 ml-16">
        {isLoading ? <div>Загрузка...</div> : renderContent()}
      </div>
    </div>
  );
}
