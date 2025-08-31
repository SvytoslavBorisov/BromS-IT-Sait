"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/*
 * GRAFFITI TRACER — игра «Обведи граффити одной линией»
 * -----------------------------------------------------
 * Задача: мышью/тачем провести непрерывную линию поверх шаблона граффити.
 * Условие: старт в отмеченной точке, один непрерывный штрих (mouse/touch down → move → up),
 * конец — в отмеченной точке. После отпускания — оценка совпадения и красивый фидбэк.
 * 
 * UI: Canvas (адаптивный), выбор макета, сложность, подсказки, перезапуск.
 * Без сторонних библиотек (кроме Tailwind для стилей, опционально lucide-react для иконок).
 */

// ───────────────────────── Утилиты ─────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

// ближняя дистанция от точки до отрезка AB
function pointSegDist(p: Pt, a: Pt, b: Pt) {
  const vx = b.x - a.x, vy = b.y - a.y; const wx = p.x - a.x, wy = p.y - a.y;
  const c1 = vx * wx + vy * wy; if (c1 <= 0) return dist(p, a);
  const c2 = vx * vx + vy * vy; if (c2 <= c1) return dist(p, b);
  const t = c1 / c2; const px = a.x + t * vx, py = a.y + t * vy; return Math.hypot(p.x - px, p.y - py);
}

function pathLength(pts: Pt[]) { let s = 0; for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]); return s; }

function resample(pts: Pt[], n: number): Pt[] {
  if (pts.length === 0) return [];
  const L = pathLength(pts); if (L === 0) return Array.from({ length: n }, () => ({ ...pts[0] }));
  const out: Pt[] = [{ ...pts[0] }];
  let acc = 0, segIdx = 1; let cur = { ...pts[0] };
  for (let i = 1; i < n; i++) {
    const target = (i * L) / (n - 1);
    while (segIdx < pts.length && acc + dist(pts[segIdx - 1], pts[segIdx]) < target) {
      acc += dist(pts[segIdx - 1], pts[segIdx]); segIdx++;
    }
    if (segIdx >= pts.length) { out.push({ ...pts[pts.length - 1] }); continue; }
    const a = pts[segIdx - 1], b = pts[segIdx];
    const d = dist(a, b);
    const t = d > 0 ? (target - acc) / d : 0;
    cur = { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
    out.push(cur);
  }
  return out;
}

function avgDirectedHausdorff(A: Pt[], B: Pt[]) {
  // средняя ближайшая дистанция от A к ломаной B
  let s = 0; for (const p of A) {
    let best = Infinity; for (let i = 1; i < B.length; i++) best = Math.min(best, pointSegDist(p, B[i - 1], B[i]));
    s += best;
  } return s / Math.max(1, A.length);
}

// Кривая Безье 3-й степени
function bezierPoint(t: number, p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt {
  const u = 1 - t; const tt = t * t, uu = u * u; const uuu = uu * u, ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}
function sampleBezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps = 48): Pt[] {
  const arr: Pt[] = []; for (let i = 0; i <= steps; i++) arr.push(bezierPoint(i / steps, p0, p1, p2, p3)); return arr;
}

// Нормализация макета (0..1 → пиксели с отступами)
function fitToBox(norm: Pt[], w: number, h: number, pad = 32): Pt[] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of norm) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
  const bw = maxX - minX, bh = maxY - minY;
  const sx = (w - pad * 2) / (bw || 1), sy = (h - pad * 2) / (bh || 1);
  const s = Math.min(sx, sy);
  const ox = pad + (w - pad * 2 - s * bw) / 2;
  const oy = pad + (h - pad * 2 - s * bh) / 2;
  return norm.map(p => ({ x: ox + (p.x - minX) * s, y: oy + (p.y - minY) * s }));
}

// ───────────────────────── Макеты граффити ─────────────────────────
type Pt = { x: number; y: number };

type TemplateId = "tag-s" | "bolt" | "loop";

function makeTemplate(id: TemplateId): Pt[] {
  // координаты в нормированных единицах (0..1)
  switch (id) {
    case "tag-s": {
      // S‑образная подпись с завитком
      const a: Pt = { x: 0.05, y: 0.80 }, b: Pt = { x: 0.35, y: 0.20 }, c: Pt = { x: 0.65, y: 0.80 }, d: Pt = { x: 0.95, y: 0.25 };
      const p1 = sampleBezier(a, { x: 0.18, y: 0.65 }, { x: 0.22, y: 0.25 }, b, 36);
      const p2 = sampleBezier(b, { x: 0.45, y: 0.05 }, { x: 0.55, y: 0.50 }, c, 36);
      const p3 = sampleBezier(c, { x: 0.78, y: 0.98 }, { x: 0.82, y: 0.35 }, d, 36);
      return [...p1, ...p2.slice(1), ...p3.slice(1)];
    }
    case "bolt": {
      // молния-зигзаг с мягкими скруглениями
      const pts: Pt[] = [
        { x: 0.08, y: 0.70 }, { x: 0.30, y: 0.40 }, { x: 0.20, y: 0.40 }, { x: 0.45, y: 0.12 },
        { x: 0.37, y: 0.12 }, { x: 0.70, y: 0.05 }, { x: 0.62, y: 0.18 }, { x: 0.90, y: 0.10 },
      ];
      // сгладим слегка через Безье между каждыми 4 точками
      let out: Pt[] = [pts[0]];
      for (let i = 0; i < pts.length - 3; i += 3) out = out.concat(sampleBezier(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], 24).slice(1));
      return out;
    }
    case "loop": {
      // большая петля с штрихом
      const loop = sampleBezier({ x: 0.10, y: 0.60 }, { x: 0.10, y: 0.10 }, { x: 0.70, y: 0.10 }, { x: 0.70, y: 0.60 }, 42);
      const back = sampleBezier({ x: 0.70, y: 0.60 }, { x: 0.70, y: 0.95 }, { x: 0.20, y: 0.95 }, { x: 0.20, y: 0.60 }, 42);
      const tail = sampleBezier({ x: 0.20, y: 0.60 }, { x: 0.35, y: 0.40 }, { x: 0.50, y: 0.70 }, { x: 0.90, y: 0.35 }, 36);
      return [...loop, ...back.slice(1), ...tail.slice(1)];
    }
  }
}

// ───────────────────────── Компонент игры ─────────────────────────
export default function GraffitiTracer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(900); const [h, setH] = useState(520);

  const [tplId, setTplId] = useState<TemplateId>("tag-s");
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("normal");
  const [showGuides, setShowGuides] = useState(true);

  const [template, setTemplate] = useState<Pt[]>([]);
  const [startPt, setStartPt] = useState<Pt>({ x: 0, y: 0 });
  const [endPt, setEndPt] = useState<Pt>({ x: 0, y: 0 });

  const [drawing, setDrawing] = useState(false);
  const [stroke, setStroke] = useState<Pt[]>([]);
  const [message, setMessage] = useState("Зажмите кнопку и обведите граффити одной непрерывной линией. Начните от ⭐.");
  const [score, setScore] = useState<number | null>(null);
  const [resultText, setResultText] = useState("");

  // Точки и толерансы по сложности — в пикселях, зависят от диагонали
  const tol = useMemo(() => {
    const diag = Math.hypot(w, h);
    if (difficulty === "easy") return { avg: 0.035 * diag, end: 0.050 * diag, pass: 80, ideal: 96 };
    if (difficulty === "hard") return { avg: 0.020 * diag, end: 0.030 * diag, pass: 90, ideal: 98 };
    return { avg: 0.026 * diag, end: 0.038 * diag, pass: 85, ideal: 97 };
  }, [difficulty, w, h]);

  // ResizeObserver для адаптива
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect(); const cw = Math.max(640, Math.floor(rect.width)); const ch = Math.max(360, Math.floor(rect.width * 0.55));
      setW(cw); setH(ch);
    });
    ro.observe(el); return () => ro.disconnect();
  }, []);

  // Перегенерим макет под новые размеры или смену шаблона
  useEffect(() => {
    const norm = makeTemplate(tplId);
    const px = fitToBox(norm, w, h, 40);
    setTemplate(px);
    setStartPt(px[0]); setEndPt(px[px.length - 1]);
    setStroke([]); setScore(null); setResultText("");
  }, [tplId, w, h]);

  // Настройка canvas пиксель-рацио
  useEffect(() => {
    const c = canvasRef.current; if (!c) return; const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    c.width = Math.floor(w * dpr); c.height = Math.floor(h * dpr); c.style.width = w + "px"; c.style.height = h + "px";
    const ctx = c.getContext("2d")!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }, [w, h, template, stroke, score, showGuides]);

  // Конвертация события в координаты
  const toLocal = useCallback((e: PointerEvent | React.PointerEvent): Pt => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const p = toLocal(e);
    // стартовать можно только рядом со стартовой звездой
    if (dist(p, startPt) > tol.end) { setMessage("Начните у ⭐ — это точка старта."); return; }
    setDrawing(true); setStroke([p]); setScore(null); setResultText(""); setMessage("Ведите линию не отрываясь…");
  }, [startPt, tol.end, toLocal]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawing) return; const p = toLocal(e);
    setStroke(prev => {
      if (prev.length === 0) return [p];
      const last = prev[prev.length - 1]; if (dist(last, p) < 1.2) return prev; // минимальный шаг
      const next = prev.concat(p); return next;
    });
  }, [drawing, toLocal]);

  const endStroke = useCallback((p: Pt) => {
    if (!drawing) return; setDrawing(false);
    setStroke(prev => (prev.length === 0 ? [] : prev.concat(p)));
    // Оценка после малого таймаута (чтобы успел setState)
    setTimeout(evaluate, 0);
  }, [drawing]);

  const onPointerUp = useCallback((e: React.PointerEvent) => { const p = toLocal(e); endStroke(p); }, [endStroke, toLocal]);
  const onPointerLeave = useCallback((e: React.PointerEvent) => { if (!drawing) return; const p = toLocal(e); endStroke(p); }, [drawing, endStroke, toLocal]);

  // Оценка совпадения
  const evaluate = useCallback(() => {
    const tplN = 256; const stN = 256;
    const T = resample(template, tplN);
    const S = resample(stroke, stN);

    // проверим окончание рядом с финишем
    const endOk = dist(S[S.length - 1], endPt) <= tol.end;

    // средняя направленная хаусдорф-дистанция (игрок → макет)
    const avgA = avgDirectedHausdorff(S, T);
    // нормализация в проценты
    const pct = clamp(100 * (1 - avgA / tol.avg), 0, 100);
    setScore(pct);

    // подсказка по характеру ошибки
    const lenT = pathLength(T), lenS = pathLength(S);
    const lenRatio = lenS / (lenT || 1);
    let hint = "Отлично!";
    if (!endOk) hint = "Финишируйте у круга — конец шаблона там.";
    else if (lenRatio < 0.88) hint = "Немного коротко — не срезайте углы.";
    else if (lenRatio > 1.12) hint = "Чуть аккуратнее — добавлены лишние крюки.";
    else if (pct < 70) hint = "Старайтесь держаться ближе к линии, особенно в изгибах.";

    setResultText(hint);

    if (pct >= tol.ideal && endOk) setMessage("Идеально! Точное попадание по траектории.");
    else if (pct >= tol.pass && endOk) setMessage("В допуске — зачет! Можно двигаться дальше.");
    else setMessage("Ещё попытка? У вас получится 💪");
  }, [stroke, template, endPt, tol]);

  const reset = useCallback(() => { setStroke([]); setScore(null); setResultText(""); setMessage("Зажмите кнопку и обведите граффити одной линией."); }, []);
  const nextTemplate = useCallback(() => { setTplId(prev => (prev === "tag-s" ? "bolt" : prev === "bolt" ? "loop" : "tag-s")); }, []);

  // Рендеринг canvas
  function draw() {
    const c = canvasRef.current; if (!c) return; const ctx = c.getContext("2d"); if (!ctx) return;
    // фон «стена»
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#0e0f12"); grad.addColorStop(1, "#171a1f");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    // сетка для ощущения масштаба
    ctx.globalAlpha = 0.08; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
    for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
    ctx.globalAlpha = 1;

    // шаблон — серый толстый штрих с пунктиром
    if (template.length > 1) {
      ctx.save();
      ctx.lineWidth = 8; ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.setLineDash([18, 10]); ctx.beginPath(); ctx.moveTo(template[0].x, template[0].y);
      for (let i = 1; i < template.length; i++) ctx.lineTo(template[i].x, template[i].y);
      ctx.stroke(); ctx.restore();

      if (showGuides) {
        // точки-ориентиры
        ctx.save(); ctx.fillStyle = "rgba(255,255,255,0.14)";
        for (let i = 0; i < template.length; i += 20) { const p = template[i]; ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      }

      // старт/финиш
      ctx.save();
      // старт — звезда
      drawStar(ctx, startPt.x, startPt.y, 5, 12, 6, "#f59e0b");
      // финиш — круг
      ctx.lineWidth = 3; ctx.strokeStyle = "#34d399"; ctx.beginPath(); ctx.arc(endPt.x, endPt.y, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    // пользовательский штрих — неоновая линия
    if (stroke.length > 1) {
      ctx.save();
      ctx.shadowBlur = 14; ctx.shadowColor = "rgba(110,231,183,0.7)";
      ctx.lineWidth = 7; ctx.strokeStyle = "#10b981"; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
      ctx.restore();
    }

    // итоговая плашка
    if (score !== null) {
      const txt = `${score.toFixed(1)}%`;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(w - 160, 16, 140, 54);
      ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(w - 160, 16, 140, 54);
      ctx.fillStyle = score >= tol.ideal ? "#34d399" : score >= tol.pass ? "#fde68a" : "#e5e7eb";
      ctx.font = "700 24px ui-sans-serif, system-ui"; ctx.textAlign = "center"; ctx.fillText(txt, w - 90, 50);
      ctx.restore();
    }
  }

  function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number, color: string) {
    let rot = Math.PI / 2 * 3; let x = cx; let y = cy; ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) { x = cx + Math.cos(rot) * outerR; y = cy + Math.sin(rot) * outerR; ctx.lineTo(x, y); rot += Math.PI / spikes; x = cx + Math.cos(rot) * innerR; y = cy + Math.sin(rot) * innerR; ctx.lineTo(x, y); rot += Math.PI / spikes; }
    ctx.lineTo(cx, cy - outerR); ctx.closePath(); ctx.fillStyle = color; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1; ctx.restore();
  }

  // ─────────────── Разметка ───────────────
  return (
    <main className="min-h-dvh relative text-neutral-100 select-none">
      {/* Фон */}
      <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/images/atelier.jpg')" }} />
      <div className="absolute inset-0 -z-10 bg-black/70 backdrop-blur-[2px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <header className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Граффити‑трейсер — обведите макет одной линией</h1>
            <p className="text-neutral-300 text-sm sm:text-base">Не отрывая мышь, начните у ⭐ и финишируйте у зелёного круга. После отпускания — оценка точности.</p>
          </div>
          <div className="flex items-end gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur text-sm">
              <div className="text-neutral-300 text-xs">Сложность</div>
              <select className="bg-transparent text-neutral-100 text-sm focus:outline-none" value={difficulty} onChange={e=>setDifficulty(e.target.value as any)}>
                <option value="easy">Лёгкая</option>
                <option value="normal">Норма</option>
                <option value="hard">Сложная</option>
              </select>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur text-sm">
              <div className="text-neutral-300 text-xs">Макет</div>
              <select className="bg-transparent text-neutral-100 text-sm focus:outline-none" value={tplId} onChange={e=>setTplId(e.target.value as TemplateId)}>
                <option value="tag-s">Подпись S</option>
                <option value="bolt">Молния</option>
                <option value="loop">Петля</option>
              </select>
            </div>
            <button onClick={nextTemplate} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-sm">Случайный макет</button>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2">
            <div ref={wrapRef} className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
              <canvas ref={canvasRef} width={w} height={h}
                className="w-full h-auto rounded-xl cursor-crosshair"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerLeave}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={reset} className="px-3 py-2 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 text-sm">Стереть</button>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="accent-amber-400" checked={showGuides} onChange={e=>setShowGuides(e.target.checked)} />
                  Показывать ориентиры
                </label>
                {score !== null && (
                  <span className={`ml-auto text-sm px-2 py-1 rounded border ${score >= tol.ideal ? 'border-emerald-300/50 bg-emerald-500/15 text-emerald-200' : score >= tol.pass ? 'border-amber-300/50 bg-amber-500/15 text-amber-200' : 'border-white/10 bg-white/5 text-neutral-100'}`}>
                    Точность: {score.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <h3 className="font-medium mb-2">Комментарий мастера</h3>
            <p className="text-sm">{message}</p>
            {resultText && <p className="text-sm text-neutral-300 mt-2">{resultText}</p>}
            <div className="mt-4 text-xs text-neutral-400">
              Совет: не режьте повороты — ведите кисть плавно. Для идеала держитесь в пределах линии.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
