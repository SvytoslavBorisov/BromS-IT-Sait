// src/components/profile/Sidebar.tsx
"use client";

import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { signOut } from "next-auth/react";
import { Tab, SubtabId, NAV } from "@/components/profile/nav";

type HeightMap = Record<string, number>;

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
  const [expandedTab, setExpandedTab] = useState<Tab | null>(null);

  // задержки hover
  const enterTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const OPEN_DELAY = 160;
  const CLOSE_DELAY = 120;

  // высота подменю для плавного сворачивания/разворачивания
  const submenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [submenuHeights, setSubmenuHeights] = useState<HeightMap>({});
  const [animatingCollapse, setAnimatingCollapse] = useState(false);

  useLayoutEffect(() => {
    const next: HeightMap = {};
    (Object.keys(NAV) as Array<Tab>).forEach((tab) => {
      const el = submenuRefs.current[tab];
      if (el) next[tab] = el.scrollHeight;
    });
    setSubmenuHeights(next);
  }, [open, expandedTab, activeSubtab]);

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
    if (enterTimer.current) {
      window.clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    if (!leaveTimer.current) {
      leaveTimer.current = window.setTimeout(() => {
        // не сбрасываем expandedTab — чтобы при повторном наведении сохранить раскрытый раздел
        if (expandedTab) setAnimatingCollapse(true);
        setOpen(false);
      }, CLOSE_DELAY);
    }
  };

  // когда меню уже свернуто и анимация прошла — снимаем флаг
  useEffect(() => {
    if (!open && animatingCollapse) {
      const t = window.setTimeout(() => setAnimatingCollapse(false), 320);
      return () => window.clearTimeout(t);
    }
  }, [open, animatingCollapse]);

  useEffect(() => () => clearTimers(), []);

  // ГЛАВНЫЙ КЛИК:
  // 1) если меню закрыто — только раскрыть (без навигации и без выбора дефолтного саба);
  // 2) если открыто и есть дети — раскрыть/свернуть подменю (без выбора дефолтного саба, контент не меняем);
  // 3) если детей нет — обычная навигация.
  const handleMainClick = (tab: Tab) => {
    const hasChildren = !!NAV[tab].children?.length;

    if (!open) {
      setOpen(true);
      return; // ← не навигируем и не выбираем саб
    }

    if (hasChildren) {
      setExpandedTab((prev) => (prev === tab ? null : tab));
      // НЕ устанавливаем first subtab — контент остаётся прежним
      setActiveTab(tab); // визуально подсветим секцию
      return;
    }

    // без детей — навигируем
    setExpandedTab(null);
    setActiveSubtab(null);
    setActiveTab(tab);
  };

  // Чеврон раскрывает/сворачивает, тоже без выбора first subtab
  const toggleExpand = (tab: Tab) => {
    setExpandedTab((prev) => (prev === tab ? null : tab));
    setActiveTab(tab);
  };

  const labelCls =
    "overflow-hidden whitespace-nowrap transition-[opacity] duration-300 " +
    (open ? "opacity-100" : "opacity-0");

  return (
    <>
      <aside
        className={[
          "fixed left-0 top-0 z-40 h-screen bg-white border-r shadow-xl",
          "pointer-events-auto",
          "transition-[width] duration-300 ease-out will-change-[width]",
          open ? "w-64" : "w-16",
          "flex flex-col",
        ].join(" ")}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        aria-label="Sidebar"
      >
        {/* Шапка */}
        <div className="px-3 py-4 flex items-center">
          <div className="h-8 w-8 rounded-md" />
          <span className={["ml-3 text-sm font-medium", labelCls].join(" ")}>Личный кабинет</span>
        </div>

        {/* Меню */}
        <nav className="flex-1 px-2 space-y-1">
          {(Object.keys(NAV) as Array<Tab>).map((tab) => {
            const isActive = activeTab === tab;
            const hasChildren = !!NAV[tab].children?.length;
            const isExpanded = expandedTab === tab;

            // вычисленная высота для анимации
            const subH = submenuHeights[tab] ?? 0;
            const submenuStyle: React.CSSProperties =
              isExpanded && open
                ? { height: subH, transition: "height 300ms ease" }
                : animatingCollapse && expandedTab === tab
                ? { height: 0, transition: "height 300ms ease" }
                : { height: 0, transition: "height 300ms ease" };

            return (
              <div key={tab}>
                {/* Линия меню — grid: [icon | label | chevron] без скачков */}
                <div
                  className={[
                    "w-full h-10 rounded-md transition-colors",
                    isActive ? "bg-gray-200" : "hover:bg-gray-100",
                    "inline-grid items-center",
                    open ? "grid-cols-[40px_1fr_16px]" : "grid-cols-[40px_0fr_16px]",
                    "gap-x-2",
                  ].join(" ")}
                >
                  {/* иконка / главный клик */}
                  <button
                    className="col-start-1 h-10 w-10 flex items-center justify-center rounded-md"
                    onClick={() => handleMainClick(tab)}
                    title={NAV[tab].label}
                  >
                    <span className="text-[15px] leading-none">
                      {NAV[tab].icon ?? NAV[tab].label[0]}
                    </span>
                  </button>

                  {/* подпись */}
                  <button
                    className={["col-start-2 text-left text-sm pr-1", labelCls].join(" ")}
                    onClick={() => handleMainClick(tab)}
                    title={NAV[tab].label}
                  >
                    {NAV[tab].label}
                  </button>

                  {/* чеврон */}
                  {hasChildren ? (
                    <button
                      className={[
                        "col-start-3 h-10 w-4 flex items-center justify-center",
                        "transition-transform",
                        isExpanded ? "rotate-90" : "rotate-0",
                        open ? "opacity-100" : "opacity-0 pointer-events-none",
                      ].join(" ")}
                      aria-label={isExpanded ? "Свернуть" : "Развернуть"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!open) {
                          setOpen(true);
                          requestAnimationFrame(() => toggleExpand(tab));
                        } else {
                          toggleExpand(tab);
                        }
                      }}
                    >
                      ▸
                    </button>
                  ) : (
                    <span className="col-start-3" />
                  )}
                </div>

                {/* Подменю — ВСЕГДА смонтировано, но анимируем высоту (без скачков) */}
                <div
                  ref={(el: HTMLDivElement | null) => {
                    submenuRefs.current[tab] = el;  // ✅ возвращает void
                  }}
                  style={submenuStyle}
                  className="overflow-hidden"
                  aria-hidden={!isExpanded}
                >
                  <div className="mt-1 ml-2 border-l pl-3 space-y-1 pb-1">
                    {NAV[tab].children?.map((child) => {
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
                </div>
              </div>
            );
          })}
        </nav>

        {/* Низ: «Выход» */}
        <div className="px-2 py-3 border-t">
          <button
            className={[
              "w-full h-10 rounded-md inline-grid items-center",
              open ? "grid-cols-[40px_1fr_0px]" : "grid-cols-[40px_0fr_0px]",
              "gap-x-2 hover:bg-gray-100 transition-colors",
            ].join(" ")}
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
          >
            <span className="col-start-1 h-10 w-10 flex items-center justify-center rounded-md">
              <span className="text-[16px]" aria-hidden>🚪</span>
            </span>
            <span className={["col-start-2 text-left text-sm", labelCls].join(" ")}>Выход</span>
          </button>
        </div>
      </aside>

      {/* overlay‑раскладка, макет страницы не двигаем */}
      <div className="pl-0" />
    </>
  );
}
