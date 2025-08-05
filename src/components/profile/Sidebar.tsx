"use client";

import { ReactNode } from "react";

// Определяем тип вкладок
export type Tab =
  | "profile"
  | "keys"
  | "all_keys"
  | "process"
  | "security"
  | "settings";

interface SidebarProps {
  activeTab: Tab;
  // принимаем колбэк, который просто получает новую вкладку
  setActiveTab: (tab: Tab) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Профиль" },
    { id: "keys", label: "Ваши ключи" },
    { id: "all_keys", label: "Все ключи" },
    { id: "process", label: "Процессы" },
    { id: "security", label: "Журнал безопасности" },
    { id: "settings", label: "Настройки" },
  ];

  return (
    <aside className="w-64 bg-white shadow-md">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-semibold">Личный кабинет</h2>
      </div>
      <nav className="p-4 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`block w-full text-left py-2 px-4 rounded transition-colors ${
              activeTab === tab.id ? "bg-gray-200" : "hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
