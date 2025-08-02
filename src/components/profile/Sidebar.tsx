"use client";

import { Dispatch, SetStateAction } from "react";

interface SidebarProps {
  activeTab: "profile" | "keys" | "all_keys" |"process" | "security" | "settings" ;
  setActiveTab: Dispatch<SetStateAction<"profile" | "keys" |  "all_keys" | "process" | "security" | "settings">>;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const tabs = [
    { id: "profile", label: "Профиль" },
    { id: "keys", label: "Ваши ключи" },
    { id: "all_keys", label: "Все ключи" },
    { id: "process", label: "Процессы" },
    { id: "security", label: "Журнал безопасности" },
    { id: "settings", label: "Настройки" },
  ] as const;

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