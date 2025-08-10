import { Dispatch, SetStateAction } from "react";
import { ReactNode } from "react";


export type Tab =
  | "profile"
  | "keys"
  | "all_keys"
  | "process"
  | "documents"
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
  keys: {
    label: "Ваши ключи",
    icon: "🔑",
    children: [
      { id: "keys.list", label: "Список" },
      { id: "keys.create", label: "Создать" },
      { id: "keys.import", label: "Импорт" },
    ],
  },
  all_keys: {
    label: "Все ключи",
    icon: "🔑",
    children: [
      { id: "all_keys.search", label: "Поиск" },
      { id: "all_keys.audit", label: "Аудит" },
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
  documents: {
    label: "Документы",
    icon: "📄",
    children: [
      { id: "documents.inbox", label: "Входящие" },
      { id: "documents.outbox", label: "Исходящие" },
      { id: "documents.templates", label: "Шаблоны" },
    ],
  },
  security: { label: "Журнал безопасности", icon: "📄"},
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
