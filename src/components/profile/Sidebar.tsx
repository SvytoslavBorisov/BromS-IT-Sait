"use client";

import { useRef, useState, useEffect } from "react";
import { Tab, SubtabId, NAV } from "@/components/profile/nav";

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
  const [open, setOpen] = useState(false);
  const enterTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const [expandedTab, setExpandedTab] = useState<Tab | null>(null);
  const OPEN_DELAY = 160;
  const CLOSE_DELAY = 120;

  const clearTimers = () => {
    if (enterTimer.current) window.clearTimeout(enterTimer.current);
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    enterTimer.current = null;
    leaveTimer.current = null;
  };

  const onEnter = () => {
    if (leaveTimer.current) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (!open && !enterTimer.current) {
      enterTimer.current = window.setTimeout(() => setOpen(true), OPEN_DELAY);
    }
  };

  const onLeave = () => {
    if (enterTimer.current) { window.clearTimeout(enterTimer.current); enterTimer.current = null; }
    if (!leaveTimer.current) {
      leaveTimer.current = window.setTimeout(() => {
        setOpen(false);
        setExpandedTab(null);   // ← ключевая строка
      }, CLOSE_DELAY);
    }
  };

const handleTabClick = (tab: Tab) => {
  const hasChildren = !!NAV[tab].children?.length;
  if (hasChildren) {
    // Переключаем развёрнутость
    setExpandedTab((prev) => (prev === tab ? null : tab));
    // Контент: если первый раз открываем – выбрать первый саб
    if (expandedTab !== tab) {
      const first = NAV[tab].children![0].id;
      setActiveSubtab((prev) => (prev?.startsWith(`${tab}.`) ? prev : first));
    }
  } else {
    setExpandedTab(null);
    setActiveSubtab(null);
  }
  setActiveTab(tab);
};

  useEffect(() => () => clearTimers(), []);

  const labelCls = [
    "transition-[opacity,margin,width] duration-400 ease-out",
    open ? "opacity-100 ml-3 w-auto" : "opacity-0 ml-0 w-0",
    "overflow-hidden whitespace-nowrap",
  ].join(" ");

  return (
    <>
      {/* сама панель — фиксирована и расширяется поверх контента */}
      <aside
        className={[
          "fixed left-0 top-0 z-40 h-screen bg-white border-r shadow-xl",
          "pointer-events-auto",
          "transition-[width] duration-400 ease-out will-change-[width]",
          open ? "w-64" : "w-16",
          "flex flex-col",
        ].join(" ")}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        aria-label="Sidebar"
      >
        {/* шапка */}
        <div className="px-3 py-4 flex items-center">
          <div className="h-8 w-8 rounded-md bg-gray-100" />
          <span className={labelCls}>Личный кабинет</span>
        </div>

        {/* меню верхнего уровня */}
        <nav className="flex-1 px-2 space-y-1">
          {(Object.keys(NAV) as Array<Tab>).map((tab) => {
            const isActive = activeTab === tab;
            const hasChildren = !!NAV[tab].children?.length;

            return (
              <div key={tab}>
                <button
                  className={[
                    "w-full h-10 rounded-md flex items-center px-2 transition-colors",
                    isActive ? "bg-gray-200" : "hover:bg-gray-100",
                  ].join(" ")}
                  onClick={() => handleTabClick(tab)}
                  aria-expanded={expandedTab === tab}
                  aria-controls={`subnav-${tab}`}
                >

                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gray-100">
                    {NAV[tab].icon ?? NAV[tab].label[0]}
                  </span>
                  <span className={labelCls}>{NAV[tab].label}</span>
                  {hasChildren && (
                    <span
                      className={[
                        "ml-auto transition-transform",
                        open ? (isActive ? "rotate-90" : "rotate-0") : "opacity-0",
                      ].join(" ")}
                      aria-hidden
                    >
                      ▸
                    </span>
                  )}
                </button>

                {/* подменю показываем только когда панель раскрыта */}
                {open && expandedTab === tab && hasChildren && (
                <div id={`subnav-${tab}`} className="mt-1 ml-2 border-l pl-3 space-y-1">
                  {NAV[tab].children!.map((child) => {
                    const subActive = activeSubtab === child.id;
                    return (
                      <button
                        key={child.id}
                        className={[
                          "block w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors",
                          subActive ? "bg-gray-100 font-medium" : "hover:bg-gray-50",
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

      {/* контент слева «зарезервирован» под узкую рейку 64px, чтобы не прыгал */}
      <div className="pl-0" />
    </>
  );
}
