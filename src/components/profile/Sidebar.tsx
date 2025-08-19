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
  const [open, setOpen] = useState(false);            // состояние панели (и для мобилы, и для десктопа)
  const [expandedTab, setExpandedTab] = useState<Tab | null>(null);
  const [isMobile, setIsMobile] = useState(false);    // брейкпоинт < md

  // задержки hover (только для десктопа)
  const enterTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);
  const OPEN_DELAY = 160;
  const CLOSE_DELAY = 120;

  // высота подменю
  const submenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [submenuHeights, setSubmenuHeights] = useState<HeightMap>({});
  const [animatingCollapse, setAnimatingCollapse] = useState(false);

  // определить мобильный режим по matchMedia
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767.98px)");
    const apply = () => setIsMobile(mql.matches);
    apply();
    mql.addEventListener?.("change", apply);
    return () => mql.removeEventListener?.("change", apply);
  }, []);

  // на мобиле при открытом меню блокируем скролл body
  useEffect(() => {
    if (!isMobile) return;
    const cls = "overflow-hidden";
    if (open) document.body.classList.add(cls);
    else document.body.classList.remove(cls);
    return () => document.body.classList.remove(cls);
  }, [isMobile, open]);

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
  useEffect(() => () => clearTimers(), []);

  // hover только для десктопа
  const onEnter = () => {
    if (isMobile) return;
    if (leaveTimer.current) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    if (!open && !enterTimer.current) {
      enterTimer.current = window.setTimeout(() => setOpen(true), OPEN_DELAY);
    }
  };
  const onLeave = () => {
    if (isMobile) return;
    if (enterTimer.current) {
      window.clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    if (!leaveTimer.current) {
      leaveTimer.current = window.setTimeout(() => {
        if (expandedTab) setAnimatingCollapse(true);
        setOpen(false);
      }, CLOSE_DELAY);
    }
  };

  useEffect(() => {
    if (!open && animatingCollapse) {
      const t = window.setTimeout(() => setAnimatingCollapse(false), 320);
      return () => window.clearTimeout(t);
    }
  }, [open, animatingCollapse]);

  // ГЛАВНЫЙ КЛИК
  const handleMainClick = (tab: Tab) => {
    const hasChildren = !!NAV[tab].children?.length;

    // Мобилка: если меню закрыто — просто открыть
    if (isMobile && !open) {
      setOpen(true);
      return;
    }

    // Десктоп: если меню закрыто — открыть без навигации
    if (!isMobile && !open) {
      setOpen(true);
      return;
    }

    if (hasChildren) {
      setExpandedTab((prev) => (prev === tab ? null : tab));
      setActiveTab(tab);
      return;
    }

    setExpandedTab(null);
    setActiveSubtab(null);
    setActiveTab(tab);

    // На мобиле по клику на пункт без детей — закрываем меню
    if (isMobile) setOpen(false);
  };

  const toggleExpand = (tab: Tab) => {
    setExpandedTab((prev) => (prev === tab ? null : tab));
    setActiveTab(tab);
  };

  const labelCls =
    "overflow-hidden whitespace-nowrap transition-[opacity] duration-300 " +
    (open ? "opacity-100" : "opacity-0");

  // Кнопка-гамбургер (верхняя шапка) — только для мобилы
  const MobileTopbar = () => (
    <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-12 bg-white/95 backdrop-blur border-b flex items-center justify-between px-3">
      <button
        aria-label="Открыть меню"
        className="h-9 w-9 rounded-md border flex items-center justify-center active:scale-95"
        onClick={() => setOpen(true)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <div className="text-sm font-medium">Личный кабинет</div>
      <div className="w-9" />
    </div>
  );

  return (
    <>
      {/* Мобильная верхняя панель */}
      <MobileTopbar />

      {/* Затемнение для мобилы */}
      {isMobile && open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Боковая панель:
          - Мобилка: off‑canvas (translateX), ширина w-72
          - Десктоп: твоя логика ширины w-16 / w-64 и hover */}
      <aside
        className={[
          "fixed left-0 top-0 z-50 h-screen bg-white border-r shadow-xl flex flex-col",
          // мобильный off-canvas
          "md:translate-x-0 md:transition-[width] md:duration-300 md:ease-out md:will-change-[width]",
          isMobile
            ? `w-72 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`
            : open
            ? "w-64"
            : "w-16",
          // hover только на десктопе
          !isMobile ? "pointer-events-auto" : "",
        ].join(" ")}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        aria-label="Sidebar"
      >
        {/* Шапка внутри панели (для десктопа видимая, для мобилы — тоже ок) */}
        <div className="px-3 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-md bg-gray-100" />
            <span className={["ml-3 text-sm font-medium hidden md:inline", labelCls].join(" ")}>
              Личный кабинет
            </span>
          </div>

          {/* Крестик закрыть — только мобилка */}
          {isMobile && (
            <button
              aria-label="Закрыть меню"
              className="h-8 w-8 rounded-md border flex items-center justify-center active:scale-95"
              onClick={() => setOpen(false)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Меню */}
        <nav className="flex-1 px-2 space-y-1">
          {(Object.keys(NAV) as Array<Tab>).map((tab) => {
            const isActive = activeTab === tab;
            const hasChildren = !!NAV[tab].children?.length;
            const isExpanded = expandedTab === tab;

            const subH = submenuHeights[tab] ?? 0;
            const submenuStyle: React.CSSProperties =
              isExpanded && open
                ? { height: subH, transition: "height 300ms ease" }
                : animatingCollapse && expandedTab === tab
                ? { height: 0, transition: "height 300ms ease" }
                : { height: 0, transition: "height 300ms ease" };

            return (
              <div key={tab}>
                {/* Линия меню */}
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

                {/* Подменю */}
                <div
                  ref={(el: HTMLDivElement | null) => {
                    submenuRefs.current[tab] = el;
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
                          onClick={() => {
                            setActiveSubtab(child.id);
                            if (isMobile) setOpen(false);
                          }}
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

      {/* Спейсер под шапку на мобилке, чтобы контент не прятался под topbar */}
      <div className="md:hidden h-12" />
    </>
  );
}
