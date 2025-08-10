"use client";

import { ReactNode } from "react";
import { Tab, SubtabId, NAV, SidebarProps } from "@/components/profile/nav"
import { cn } from "@/lib/utils"; 


const tabs = [
  { id: "profile", label: "Профиль", icon: "👤" },
  { id: "keys", label: "Ключи", icon: "🔑" },
  { id: "documents", label: "Документы", icon: "📄" },
  { id: "settings", label: "Настройки", icon: "⚙️" },
];


export default function Sidebar({
  activeTab,
  setActiveTab,
  activeSubtab,
  setActiveSubtab,
}: {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  activeSubtab: SubtabId | null;
  setActiveSubtab: (s: SubtabId | null | ((p: SubtabId | null) => SubtabId | null)) => void;
}) {
  return (
    <aside
      className={[
        "group relative bg-white shadow-md h-screen",
        "w-16 hover:w-64",                          // ← узкая полоса → разворот
        "transition-[width] duration-300 ease-in-out",
        "overflow-visible",                         // чтобы выползали элементы
      ].join(" ")}
    >
      {/* Хедер: текст скрыт в узком состоянии */}
      <div className="border-b px-3 py-4 sm:px-4 sm:py-5">
        <h2
          className={[
            "text-xl font-semibold whitespace-nowrap",
            "opacity-0 group-hover:opacity-100",
            "transition-opacity duration-200",
          ].join(" ")}
        >
          Личный кабинет
        </h2>
      </div>

      <nav className="p-2 space-y-1">
        {(Object.keys(NAV) as Array<Tab>).map((tab) => {
          const isActive = activeTab === tab;
          const hasChildren = !!NAV[tab].children?.length;

          return (
            <div key={tab}>
              {/* Вкладка верхнего уровня */}
              <button
                className={[
                  "flex w-full items-center justify-between text-left py-2 px-2 rounded-md transition-colors",
                  isActive ? "bg-gray-200" : "hover:bg-gray-100",
                ].join(" ")}
                onClick={() => {
                  if (hasChildren) {
                    const first = NAV[tab].children![0].id;
                    setActiveSubtab((prev) =>
                      prev?.startsWith(`${tab}.`) ? prev : first
                    );
                  } else {
                    setActiveSubtab(null);
                  }
                  setActiveTab(tab);
                }}
                aria-expanded={isActive && hasChildren ? true : false}
                aria-controls={`subnav-${tab}`}
                title={NAV[tab].label} // подсказка в узком режиме
              >
                {/* Иконка если есть (или буква) */}
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-100">
                  {NAV[tab].icon ?? NAV[tab].label[0]}
                </span>

                {/* Лейбл: скрыт в узком, виден при hover */}
                <span
                  className={[
                    "ml-2 flex-1 truncate text-sm",
                    "opacity-0 group-hover:opacity-100",
                    "transition-opacity duration-200",
                  ].join(" ")}
                >
                  {NAV[tab].label}
                </span>

                {/* Стрелка: показывать только когда раскрыто */}
                {hasChildren && (
                  <span
                    className={[
                      "transition-transform",
                      isActive ? "rotate-90" : "rotate-0",
                      "opacity-0 group-hover:opacity-100",
                    ].join(" ")}
                    aria-hidden
                  >
                    ▸
                  </span>
                )}
              </button>

              {/* Подвкладки — видны только у активной вкладки и при hover панели */}
              {isActive && hasChildren && (
                <div
                  id={`subnav-${tab}`}
                  className={[
                    "mt-1 ml-3 pl-3 border-l space-y-1",
                    "hidden group-hover:block", // ← показывать только при раскрытой панели
                  ].join(" ")}
                >
                  {NAV[tab].children!.map((child) => {
                    const subActive = activeSubtab === child.id;
                    return (
                      <button
                        key={child.id}
                        className={[
                          "block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors",
                          subActive
                            ? "bg-gray-100 font-medium"
                            : "hover:bg-gray-50",
                        ].join(" ")}
                        onClick={() => setActiveSubtab(child.id)}
                        title={child.label}
                      >
                        {child.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}