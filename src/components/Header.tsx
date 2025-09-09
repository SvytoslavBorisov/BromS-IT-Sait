// components/Header.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
        "bg-white/60 ring-1 ring-black/10 backdrop-blur hover:bg-white/80",
        className,
      ].join(" ")}
    >
      <span className="sr-only">Menu</span>
      <motion.span
        className="absolute left-2 right-2 top-3 h-[2px] rounded bg-gradient-to-r from-indigo-700 to-cyan-600"
        animate={open ? { rotate: 45, y: 7 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
      />
      <motion.span
        className="absolute left-2 right-2 top-1/2 -mt-[1px] h-[2px] rounded bg-gradient-to-r from-indigo-700 to-cyan-600"
        animate={open ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.18, ease: EASE }}
      />
      <motion.span
        className="absolute left-2 right-2 bottom-3 h-[2px] rounded bg-gradient-to-r from-indigo-700 to-cyan-600"
        animate={open ? { rotate: -45, y: -7 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.22, ease: EASE }}
      />
    </button>
  );
}

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState<string>("#about");
  const [progress, setProgress] = useState(0);
  const prefersReduced = useReducedMotion();

  // Прогресс чтения
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = (doc.scrollHeight - doc.clientHeight) || 1;
      setProgress(Math.min(1, Math.max(0, (window.scrollY || 0) / max)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Подсветка активного раздела
  useEffect(() => {
    const ids = NAV.map((n) => n.href.slice(1));
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(`#${e.target.id}`)),
      { rootMargin: "-45% 0px -45% 0px", threshold: 0.01 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
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

  const capsule =
    "relative z-10 px-4 py-2 rounded-full text-sm font-medium transition " +
    "text-slate-700 hover:text-slate-900 hover:bg-indigo-50/60 aria-[current=true]:text-white";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition backdrop-blur-xl">
      {/* Reading progress + cometa */}
      <div className="absolute inset-x-0 top-0 h-[2px] overflow-visible">
        <div
          className="h-full origin-left bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-400"
          style={{ transform: `scaleX(${progress})`, transition: "transform .25s cubic-bezier(.4,0,.2,1)" }}
        />
        <div
          className="absolute -top-[3px] h-2 w-2 rounded-full shadow-md
                     bg-[radial-gradient(closest-side,white,rgba(255,255,255,.0))]
                     ring-1 ring-white/60"
          style={{ left: `${progress * 100}%`, transform: "translateX(-50%)" }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div className="h-16 md:h-[4.75rem] flex items-center justify-between">
          {/* Brand */}
          <Link href="#top" onClick={smoothTo("#top")} className="inline-flex items-center gap-2 select-none">
            <motion.span
              className="h-3.5 w-3.5 md:h-4 md:w-4 rounded-full ring-1 ring-black/10 shadow
                         bg-[conic-gradient(from_0deg,rgba(99,102,241,1),rgba(14,165,233,1),rgba(34,197,94,.9),rgba(99,102,241,1))]"
              animate={prefersReduced ? {} : { scale: [1, 1.08, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: EASE }}
            />
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
            <div className="relative flex items-center gap-1 rounded-full px-1 py-1 backdrop-blur ring-1 ring-black/10 bg-white/70">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active === n.href}
                  onClick={smoothTo(n.href)}
                  className={capsule}
                >
                  {n.label}
                </Link>
              ))}
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
          </nav>

          {/* Mobile hamburger */}
          <AnimatedHamburger
            open={isOpen}
            onClick={() => setIsOpen((v) => !v)}
            className={["md:hidden", isOpen ? "fixed top-2 right-2 z-[60]" : ""].join(" ")}
          />
        </motion.div>
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
              initial={prefersReduced ? false : { y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="md:hidden fixed left-0 right-0 top-0 z-50
                         max-h-[100svh] pt-[calc(env(safe-area-inset-top)+12px)] pb-2
                         bg-white/95 backdrop-blur-xl shadow-xl"
            >
              <ul className="px-3">
                {NAV.map((n, i) => (
                  <motion.li
                    key={n.href}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: EASE, delay: 0.04 * i }}
                  >
                    <Link
                      href={n.href}
                      onClick={smoothTo(n.href)}
                      className="block px-3 py-3 rounded-2xl text-base font-medium text-slate-900
                                 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-cyan-50"
                    >
                      {n.label}
                    </Link>
                  </motion.li>
                ))}
                <motion.li
                  className="pt-1 pb-2"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: EASE, delay: 0.12 }}
                >
                  <Link
                    href="#contact"
                    onClick={smoothTo("#contact")}
                    className="block px-3 py-3 rounded-2xl text-base font-semibold text-white text-center shadow
                               bg-gradient-to-r from-indigo-600 to-cyan-500"
                  >
                    Связаться
                  </Link>
                </motion.li>
              </ul>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
