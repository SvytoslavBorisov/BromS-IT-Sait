// components/Footer.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const prefersReduced = useReducedMotion();

  const links = [
    { href: "/", label: "Главная" },
    { href: "/about", label: "О нас" },
    { href: "/services", label: "Услуги" },
    { href: "/portfolio", label: "Портфолио" },
    { href: "/contact", label: "Контакты" },
  ];

  return (
    <footer className="relative isolate overflow-hidden bg-[#0a0a0a] text-neutral-300 selection:bg-white/20">
      {/* ——— Технологичный интерактивный фон (canvas-созвездие) ——— */}
      <TechConstellation reduced={!!prefersReduced} />

      {/* ——— Лёгкая «скан-полоса» поверх (ч/б) ——— */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute inset-0 opacity-[.08] [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
          <div className="absolute inset-x-[-50%] top-1/3 h-24 bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.6)_50%,rgba(255,255,255,0)_100%)] blur-md animate-scan" />
        </div>
      </div>

      {/* ——— Контент ——— */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16 pt-10 md:pt-16">
        <div className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-xl shadow-[0_30px_120px_-40px_rgba(0,0,0,.7)] overflow-hidden">
          {/* Верх: короткий слоган + CTA */}
          <div className="px-6 py-6 md:px-12 md:py-10 border-b border-white/10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h3 className="text-white text-2xl md:text-3xl font-semibold tracking-tight">
                  Делаем чистые интерфейсы и понятные решения
                </h3>
                <p className="mt-1 text-sm md:text-base text-neutral-400">
                  Быстро, прозрачно и технологично — от идеи до поддержки.
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href="https://t.me/yourhandle"
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold
                             text-[#0a0a0a] bg-white hover:bg-white/90 ring-1 ring-white/80 transition"
                >
                  Написать в Telegram
                </a>
                <a
                  href="mailto:bromsit@mail.ru"
                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold
                             text-white bg-transparent ring-1 ring-white/30 hover:ring-white/60 transition"
                >
                  E-mail
                </a>
              </div>
            </div>
          </div>

          {/* Секции футера */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 p-8 md:p-12">
            {/* Компания */}
            <div>
              <h4 className="text-white text-lg font-semibold mb-3 tracking-wide">
                БромС&nbsp;Ай&nbsp;Ти
              </h4>
              <p className="leading-relaxed text-neutral-300/90 text-sm">
                ООО «БромС Ай Ти» <br />
                ИНН: 6453169905 <br />
                г. Саратов, ул. Примерная, д. 1
              </p>
            </div>

            {/* Навигация */}
            <div>
              <h4 className="text-white text-lg font-semibold mb-3 tracking-wide">
                Навигация
              </h4>
              <ul className="space-y-1.5">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group inline-flex items-center gap-2 text-neutral-300 hover:text-white transition text-sm"
                    >
                      <span className="relative">
                        {l.label}
                        <span className="pointer-events-none absolute -bottom-0.5 left-0 h-[1.5px] w-0 bg-white/80 transition-all duration-300 group-hover:w-full" />
                      </span>
                      <svg
                        className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Контакты */}
            <div>
              <h4 className="text-white text-lg font-semibold mb-3 tracking-wide">
                Контакты
              </h4>
              <p className="leading-relaxed text-sm">
                Email:{" "}
                <a className="link" href="mailto:bromsit@mail.ru">
                  bromsit@mail.ru
                </a>
                <br />
                Телефон:{" "}
                <a className="link" href="tel:+79172134586">
                  +7 (917) 213-45-86
                </a>
              </p>
            </div>

            {/* Соцсети */}
            <div>
              <h4 className="text-white text-lg font-semibold mb-3 tracking-wide">
                Мы в соцсетях
              </h4>
              <div className="flex items-center gap-3">
                <Social href="https://vk.com" label="VK">
                  <path d="M3 7c0-1.1.9-2 2-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  <path d="M7 9h2.1c.2 1 .6 1.9 1.2 2.7.5.7 1.2 1.3 2 1.6 0 0 .2.1.3 0 .2 0 .3-.3.4-.5l.3-.8c.1-.3.3-.6.6-.7.2-.1.5 0 .7.1l1.8 1.3c.2.1.4.3.4.5 0 .2-.1.3-.2.5-.7.9-1.5 1.6-2.5 2.1-1 .5-2.1.8-3.3.8-1.1 0-2.1-.2-3.1-.7a6.8 6.8 0 01-2.3-1.9A8.8 8.8 0 017 9z" />
                </Social>
                <Social href="https://t.me/yourhandle" label="Telegram">
                  <path d="M21.5 4.5L3.7 11.6c-.8.3-.8 1.5 0 1.8l4.3 1.5 1.6 4.8c.3.9 1.5 1 1.9.2l2.4-4.3 4.6 3.4c.7.5 1.7.1 1.9-.8l2.4-12c.2-.9-.7-1.6-1.6-1.2z" />
                </Social>
                <Social href="https://github.com/SvytoslavBorisov" label="GitHub">
                  <path d="M12 2a10 10 0 00-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.9.6-3.5-1.2-3.5-1.2-.5-1.1-1.2-1.4-1.2-1.4-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 .1 1.6-.7 1.8-1 .1-.7.4-1.1.7-1.4-2.3-.3-4.7-1.1-4.7-5a3.9 3.9 0 011-2.7c-.1-.3-.5-1.4.1-2.9 0 0 .9-.3 2.9 1.1a9.9 9.9 0 015.2 0c2-1.4 2.9-1.1 2.9-1.1.6 1.5.2 2.6.1 2.9a3.9 3.9 0 011 2.7c0 3.9-2.4 4.7-4.7 5 .4.3.8 1 .8 2.1v3.1c0 .3.2.7.8.5A10 10 0 0012 2z" />
                </Social>
              </div>
            </div>
          </div>

          {/* Нижняя плашка */}
          <div className="border-t border-white/10 px-6 md:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-neutral-400">
              © {currentYear} ООО «БромС Ай Ти». Все права защищены.
            </p>

            <a
              href="#top"
              className="group inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 ring-1 ring-white/15 hover:ring-white/25 hover:bg-white/10 transition"
              onClick={(e) => {
                if (location.hash !== "#top") e.preventDefault();
                document.querySelector("#top")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span className="text-sm">Наверх</span>
              <svg
                className="h-4 w-4 transition group-hover:-translate-y-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* ——— Стили: фон, ссылки ——— */}
      <style>{`
        .link {
          color: #fff;
          position: relative;
        }
        .link::after {
          content: "";
          position: absolute;
          left: 0; right: 0; bottom: -2px; height: 1px;
          background: linear-gradient(90deg, transparent, #fff, transparent);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform .35s ease;
          opacity: .9;
        }
        .link:hover::after { transform: scaleX(1); }
      `}</style>
    </footer>
  );
}

/* ——— Интерактивный фон: созвездие с линиями (canvas), ч/б ——— */
function TechConstellation({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointsRef = useRef<Point[]>([]);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const runningRef = useRef<boolean>(false);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const lastTsRef = useRef<number>(0);

  const isMobile =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(max-width: 768px)")?.matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    const targetDpr = Math.max(1, Math.min(isMobile ? 1.5 : 2, window.devicePixelRatio || 1));

    const resize = () => {
      // Берём реальный прямоугольник родителя — так надёжнее на мобиле
      const parent = canvas.parentElement!;
      const rect = parent.getBoundingClientRect();
      const cw = Math.max(1, Math.floor(rect.width));
      const ch = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(cw * targetDpr);
      canvas.height = Math.floor(ch * targetDpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      ctx.setTransform(targetDpr, 0, 0, targetDpr, 0, 0);

      // Плотность точек под площадь (как было)
      const base = Math.round((cw * ch) / 26000);
      const count = Math.max(18, Math.min(60, base));
      pointsRef.current = makePoints(count, cw, ch, reduced);
    };

    // pointer
    const onPointerMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointerRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onPointerLeave = () => (pointerRef.current = null);
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const r = canvas.getBoundingClientRect();
      pointerRef.current = { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const onTouchEnd = () => (pointerRef.current = null);

    // throttle resize
    let resizeRaf = 0;
    const onResize = () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(resize);
    };

    resize();
    window.addEventListener("resize", onResize, { passive: true });
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave, { passive: true });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });

    // главный цикл с адаптивным FPS
    const maxFps = reduced ? 30 : isMobile ? 36 : 60;
    const frameInterval = 1000 / maxFps;

    const loop = (ts: number) => {
      if (!runningRef.current) return;
      const last = lastTsRef.current || ts;
      if (ts - last >= frameInterval) {
        drawFrame(ctx, canvas, pointsRef.current, pointerRef.current, reduced, targetDpr);
        lastTsRef.current = ts;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    // ВАЖНО: наблюдаем не за canvas (absolute, z-index < 0), а за его РОДИТЕЛЕМ (footer)
    const target = canvas.parentElement!;
    ioRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? false;
        if (visible && !document.hidden) {
          runningRef.current = true;
          lastTsRef.current = 0;
          if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);
        } else {
          runningRef.current = false;
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        }
      },
      {
        root: null,
        threshold: 0.01,
        // небольшой запас, чтобы стартовать раньше, чем блок попадёт в видимую область
        rootMargin: "200px 0px",
      }
    );
    ioRef.current.observe(target);

    // Пауза при скрытии вкладки
    const onVisibility = () => {
      const shouldRun = !document.hidden;
      if (shouldRun) {
        lastTsRef.current = 0;
        runningRef.current = true;
        if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);
      } else {
        runningRef.current = false;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // fallback: если IO ещё не успел сработать, но блок уже виден — стартуем
    runningRef.current = true;
    if (!rafRef.current) rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("visibilitychange", onVisibility);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ioRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-auto absolute inset-0 -z-10 opacity-[.85]
                 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_90%,transparent)]"
      aria-hidden
    />
  );
}

type Point = { x: number; y: number; vx: number; vy: number };

function makePoints(n: number, w: number, h: number, reduced: boolean): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const v = reduced ? 0 : 0.2 + Math.random() * 0.35;
    const a = Math.random() * Math.PI * 2;
    pts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v });
  }
  return pts;
}

/** ВАЖНО: размеры берём из canvas.width/height, НО делим на DPR — так координаты верные */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  points: Point[],
  pointer: { x: number; y: number } | null,
  reduced: boolean,
  dpr: number
) {
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  // фон (как раньше)
  if (reduced) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(10,10,10,1)";
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = "rgba(10,10,10,0.9)";
    ctx.fillRect(0, 0, w, h);
  }

  // движение
  if (!reduced) {
    for (const p of points) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
    }
  }

  // параметры связей
  const maxDist = Math.min(140, Math.max(100, Math.min(w, h) * 0.18));
  const maxDist2 = maxDist * maxDist;

  // простая локальная сетка (оптимизация), но БЕЗ риска «пропасть»
  const cell = Math.max(32, maxDist);
  const cols = Math.max(1, Math.ceil(w / cell));
  const rows = Math.max(1, Math.ceil(h / cell));
  const grid: number[][] = Array(cols * rows);
  for (let i = 0; i < grid.length; i++) grid[i] = [];

  const cellIndex = (x: number, y: number) => {
    const cx = Math.min(cols - 1, Math.max(0, Math.floor(x / cell)));
    const cy = Math.min(rows - 1, Math.max(0, Math.floor(y / cell)));
    return cy * cols + cx;
  };

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    grid[cellIndex(p.x, p.y)].push(i);
  }

  // линии
  ctx.lineWidth = 1;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const locals: number[] = [];
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const nx = cx + ox, ny = cy + oy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const arr = grid[ny * cols + nx];
          if (arr && arr.length) locals.push(...arr);
        }
      }
      for (let i = 0; i < locals.length; i++) {
        const p1 = points[locals[i]];
        for (let j = i + 1; j < locals.length; j++) {
          const p2 = points[locals[j]];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < maxDist2) {
            let alpha = 0.15 * (1 - Math.sqrt(d2) / maxDist);
            if (pointer) {
              const mx = (p1.x + p2.x) * 0.5;
              const my = (p1.y + p2.y) * 0.5;
              const ddx = mx - pointer.x;
              const ddy = my - pointer.y;
              const pd = Math.sqrt(ddx * ddx + ddy * ddy);
              alpha += Math.max(0, 0.35 - pd / 500);
            }
            const a = Math.min(0.45, Math.max(0.04, alpha));
            if (a > 0.01) {
              ctx.strokeStyle = `rgba(255,255,255,${a})`;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }
    }
  }

  // точки
  for (const p of points) {
    const r = 1.2;
    let a = 0.35;
    if (pointer) {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      a = Math.min(0.9, 0.15 + Math.max(0, 0.5 - d / 220));
    }
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ——— Малый wrapper для соц-иконок ——— */
function Social({
  href,
  label,
  children,
}: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="group inline-flex h-10 w-10 items-center justify-center rounded-xl
                 bg-white/10 ring-1 ring-white/15 hover:ring-white/30 hover:bg-white/15
                 transition relative overflow-hidden"
      target={href.startsWith("http") ? "_blank" : undefined}
    >
      {/* sheen */}
      <span className="pointer-events-none absolute -left-6 -top-6 h-8 w-16 rotate-45 bg-white/20 group-hover:translate-x-16 transition-transform duration-700" />
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-white/90 group-hover:scale-110 transition-transform duration-300"
        fill="currentColor"
        aria-hidden
      >
        {children}
      </svg>
    </Link>
  );
}
