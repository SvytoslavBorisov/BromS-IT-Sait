import { Dispatch, SetStateAction } from "react";
import { ReactNode } from "react";


export type Tab =
  | "profile"
  | "storage"
  | "keys"
  | "process"
  | "security"
  | "settings";

export interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  activeSubtab: SubtabId | null;
  setActiveSubtab: Dispatch<SetStateAction<SubtabId | null>>; // <-- важно
}

export type SubtabId = `${Tab}.${string}`;

export const NAV: Record<
  Tab,
  {
    label: string;
    icon?: string | ReactNode; // можно эмодзи или JSX
    children?: Array<{ id: SubtabId; label: string }>;
  }
> = {
  profile: { label: "Профиль", icon: "👤"  },
  storage: { 
    label: "Хранилище",
     icon: "🗃️",
    children: [
      { id: "storage.keys", label: "Ключи" },
      { id: "storage.shares", label: "Доли" },
      { id: "storage.certs", label: "Сертификаты" },
      { id: "storage.docs", label: "Документы" },
    ],
    },
  keys: {
    label: "Ваши ключи",
    icon: "🔑",
    children: [
      { id: "keys.list", label: "Список" },
      { id: "keys.create", label: "Создать" },
      { id: "keys.import", label: "Импорт" },
    ],
  },
  process: {
    label: "Процессы",
    icon: "⚙️",
    children: [
      { id: "process.active", label: "Активные" },
      { id: "process.history", label: "История" },
    ],
  },
  security: { 
    label: "Журнал безопасности", 
    icon: "📄"},
  settings: {
    label: "Настройки",
    icon: "⚙️",
    children: [
      { id: "settings.profile", label: "Профиль" },
      { id: "settings.notifications", label: "Уведомления" },
      { id: "settings.access", label: "Доступ" },
    ],
  },
};
