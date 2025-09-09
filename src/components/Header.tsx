// components/Header.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const NAV = [
  { href: "#about", label: "О нас" },
  { href: "#portfolio", label: "Портфолио" },
  { href: "#contact", label: "Контакты" },
] as const;

const EASE = [0.4, 0, 0.2, 1] as const;

function AnimatedHamburger({
  open, onClick, className = "",
}: { open: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      aria-label={open ? "Закрыть меню" : "Открыть меню"}
      aria-expanded={open}
      onClick={onClick}
      className={[
        "relative h-10 w-10 rounded-xl transition active:scale-[.98]",
        "bg-white/70 ring-1 ring-black/10 backdrop-blur hover:bg-white/80",
        className,
      ].join(" ")}
    >
      <span className="sr-only">Menu</span>
      <span
        className="absolute left-2 right-2 top-3 h-[2px] rounded bg-gradient-to-r from-indigo-700 to-cyan-600 transition-transform duration-200"
        style={{ transform: open ? "translateY(7px) rotate(45deg)" : "none" }}
      />
      <span
        className="absolute left-2 right-2 top-1/2 -mt-[1px] h-[2px] rounded bg-gradient-to-r from-indigo-700 to-cyan-600 transition-opacity duration-150"
        style={{ opacity: open ? 0 : 1 }}
      />
      <span
        className="absolute left-2 right-2 bottom-3 h-[2px] rounded bg-gradient-to-r from-indigo-700 to-cyan-600 transition-transform duration-200"
        style={{ transform: open ? "translateY(-7px) rotate(-45deg)" : "none" }}
      />
    </button>
  );
}

export default function Header() {
  const reduced = useReducedMotion();

  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState<string>("#about");

  /** ====== Прогресс чтения: без setState на каждом скролле ====== */
  const barRef = useRef<HTMLDivElement | null>(null);
  const cometRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const doc = document.documentElement;
        const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
        const p = Math.min(1, Math.max(0, (window.scrollY || 0) / max));
        if (barRef.current) {
          barRef.current.style.transform = `scaleX(${p})`;
        }
        if (cometRef.current) {
          cometRef.current.style.left = `${p * 100}%`;
          cometRef.current.style.transform = "translateX(-50%)";
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /** ====== Подсветка активного раздела (минимум изменений состояния) ====== */
  useEffect(() => {
    const ids = NAV.map((n) => n.href.slice(1));
    const last = { current: active };
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const href = `#${e.target.id}`;
            if (href !== last.current) {
              last.current = href;
              setActive(href);
            }
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0.01 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const smoothTo = useCallback(
    (href: string) => (e: React.MouseEvent) => {
      if (!href.startsWith("#")) return;
      e.preventDefault();
      document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsOpen(false);
    },
    []
  );

  // Блокируем скролл боди при открытом меню
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  /** ====== Капсулы навигации: контрастные цвета и статичный «хало»-бордер ====== */
  const capsuleBase =
    "relative z-10 px-4 py-2 rounded-full text-sm font-medium transition-colors " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60";

  const capsuleInactive =
    "text-slate-800 bg-slate-50/90 ring-1 ring-black/10 hover:bg-slate-100/90";

  const capsuleActive =
    "text-white bg-gradient-to-r from-indigo-600 to-cyan-500 shadow-sm";

  // Красивый, но статичный обводящий бордер вокруг группы
  // (конусный градиент + mask → без анимаций)
  const groupOuter =
    "relative flex items-center gap-1 rounded-full p-[1.5px] " +
    "bg-[conic-gradient(from_180deg,rgba(99,102,241,.5),rgba(14,165,233,.5),rgba(34,197,94,.5),rgba(99,102,241,.5))]";

  const groupInner =
    "relative flex items-center gap-1 rounded-full px-1 py-1 " +
    "backdrop-blur bg-white/80 ring-1 ring-black/10 shadow-sm " +
    "[mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] " +
    "[mask-composite:exclude]";

  const brandDotClass = useMemo(
    () =>
      "h-3.5 w-3.5 md:h-4 md:w-4 rounded-full ring-1 ring-black/10 shadow " +
      // Статично, без анимации
      "bg-[conic-gradient(from_0deg,#6366f1,#0ea5e9,#22c55e,#6366f1)]",
    []
  );

  return (
    <header className="absolute top-0 left-0 right-0 z-50 transition backdrop-blur-xl">
      {/* Reading progress (без ре-рендеров) */}
      <div className="absolute inset-x-0 top-0 h-[2px] overflow-visible">
        <div
          ref={barRef}
          className="h-full origin-left bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400"
          style={{ transform: "scaleX(0)", transition: "transform .25s cubic-bezier(.4,0,.2,1)" }}
        />
        <div
          ref={cometRef}
          className="absolute -top-[3px] h-2 w-2 rounded-full shadow-md
                     bg-[radial-gradient(closest-side,white,rgba(255,255,255,.0))]
                     ring-1 ring-white/60"
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="h-16 md:h-[4.75rem] flex items-center justify-between">
          {/* Brand */}
          <Link href="#top" onClick={smoothTo("#top")} className="inline-flex items-center gap-2 select-none">
            <span className={brandDotClass} />
            <span
              className={[
                "font-semibold tracking-wide leading-none",
                "text-[20px] md:text-[23px]",
                "bg-clip-text text-transparent",
                "bg-[linear-gradient(180deg,#111,#444)]",
                "[text-shadow:0_1px_0_rgba(255,255,255,.6)]",
              ].join(" ")}
            >
              БромС&nbsp;IT
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:block">
            <div className={groupOuter}>
              <div className={groupInner}>
                {NAV.map((n) => {
                  const current = active === n.href;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      aria-current={current}
                      onClick={smoothTo(n.href)}
                      className={[
                        capsuleBase,
                        current ? capsuleActive : capsuleInactive,
                      ].join(" ")}
                    >
                      {n.label}
                    </Link>
                  );
                })}
                <Link
                  href="#contact"
                  onClick={smoothTo("#contact")}
                  className="ml-1 relative z-10 px-4 py-2 rounded-full text-sm font-medium text-white
                             bg-gradient-to-r from-indigo-600 to-cyan-500 shadow-sm
                             hover:shadow-md hover:-translate-y-0.5 transition"
                >
                  Связаться
                </Link>
              </div>
            </div>
          </nav>

          {/* Mobile hamburger */}
          <AnimatedHamburger
            open={isOpen}
            onClick={() => setIsOpen((v) => !v)}
            className={["md:hidden", isOpen ? "fixed top-2 right-2 z-[60]" : ""].join(" ")}
          />
        </div>
      </div>

      {/* Mobile overlay + panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setIsOpen(false)}
            />
            <motion.nav
              key="panel"
              initial={reduced ? false : { y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="md:hidden fixed left-0 right-0 top-0 z-50
                         max-h-[100svh] pt-[calc(env(safe-area-inset-top)+12px)] pb-2
                         bg-white/95 backdrop-blur-xl shadow-xl"
            >
              <ul className="px-3">
                {NAV.map((n, i) => (
                  <li key={n.href} style={{ animation: `fadeUp .22s cubic-bezier(.4,0,.2,1) ${0.04 * i}s both` }}>
                    <Link
                      href={n.href}
                      onClick={smoothTo(n.href)}
                      className="block px-3 py-3 rounded-2xl text-base font-medium text-slate-900
                                 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-cyan-50"
                    >
                      {n.label}
                    </Link>
                  </li>
                ))}
                <li style={{ animation: "fadeUp .22s cubic-bezier(.4,0,.2,1) .12s both" }} className="pt-1 pb-2">
                  <Link
                    href="#contact"
                    onClick={smoothTo("#contact")}
                    className="block px-3 py-3 rounded-2xl text-base font-semibold text-white text-center shadow
                               bg-gradient-to-r from-indigo-600 to-cyan-500"
                  >
                    Связаться
                  </Link>
                </li>
              </ul>
              <style>{`
                @keyframes fadeUp { 0%{opacity:0; transform:translateY(6px)} 100%{opacity:1; transform:translateY(0)} }
              `}</style>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
