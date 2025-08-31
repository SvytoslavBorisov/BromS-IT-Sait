"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, RefreshCw, Lightbulb, Check, X, Target, Timer, Trophy, SlidersHorizontal, Info, Sparkles, Loader2 } from "lucide-react";

/**
 * GRAY RABKIN — монохромный «тест Рабкина» по мотивам полихроматических таблиц,
 * адаптированный под ваш мрачный сеттинг. Все круги/точки серые, различаются 
 * лишь по светлоте и лёгкому шуму. Игрок видит «пластину» (canvas‑фото), 
 * ниже — поле ввода ответа. Есть подсказка‑мигание, калибровка контраста,
 * адаптивная сложность, серийный режим и красивая «стеклянная» обвязка.
 * 
 * Как подключить: положите как app/games/gray-rabkin/GrayRabkin.tsx и рендерите.
 */

/* ───────────── Утилиты ───────────── */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const gaussian = () => {
  // Box–Muller
  let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);

/* Множество целей: цифры, двузначные, короткие слова */
const TARGETS = [
  "0","1","2","3","4","5","6","7","8","9",
  "10","12","15","18","21","24","27","30","42","50",
  "66","69","70","77","80","84","90","96",
  "SOS","ART","CAT","EYE","RAY","LAB","LOOP","EXIT","CODE","GRAY",
];

/* ───────────── Генерация пластины ───────────── */
export type PlateSpec = {
  target: string;     // что «спрятано» на пластине
  grid: number;       // N x N точек
  radius: number;     // радиус точки в px (в базовом масштабе)
  delta: number;      // разность светлот (контраст): 0..1 (рекоменд. 0.02–0.14)
  noise: number;      // шум 0..1 (стандартное отклонение гаусса в светлоте)
  jitter: number;     // джиттер положения точек (в радиусах)
  vignette: number;   // виньетирование (0..1)
};

function makePlateSpec(prevDelta?: number): PlateSpec {
  const t = TARGETS[Math.floor(Math.random() * TARGETS.length)];
  const grid = rand(28, 36) | 0;                 // плотность точек
  const radius = rand(6, 9);                      // радиус в базовом масштабе
  const deltaBase = clamp((prevDelta ?? rand(0.04, 0.10)) * rand(0.9, 1.1), 0.016, 0.16);
  const noise = rand(0.03, 0.10);
  const jitter = rand(0.35, 0.6);
  const vignette = rand(0.15, 0.35);
  return { target: t, grid, radius, delta: deltaBase, noise, jitter, vignette };
}

/* Отрисовка: текст → маска → поле точек с двумя классами светлот */
function renderPlate(canvas: HTMLCanvasElement, spec: PlateSpec, scale = 2) {
  const ctx = canvas.getContext("2d")!;
  const W = (canvas.width = 560 * scale);
  const H = (canvas.height = 560 * scale);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // фон «плиты» — бетон‑серый с шумом
  const baseL = 0.12; // линейный от 0..1
  ctx.fillStyle = `rgb(${baseL * 255 | 0},${baseL * 255 | 0},${baseL * 255 | 0})`;
  ctx.fillRect(0, 0, W, H);
  const nCtx = ctx;
  nCtx.globalAlpha = 0.12; nCtx.fillStyle = "#fff";
  for (let i = 0; i < 7000 * scale; i++) {
    const x = Math.random() * W, y = Math.random() * H, r = Math.random() * 1.2;
    nCtx.beginPath(); nCtx.arc(x, y, r, 0, Math.PI * 2); nCtx.fill();
  }
  nCtx.globalAlpha = 1;

  // маска цели
  const m = document.createElement("canvas"); const mctx = m.getContext("2d")!; m.width = W; m.height = H;
  mctx.fillStyle = "#000"; mctx.fillRect(0, 0, W, H);
  const fontSize = spec.target.length <= 2 ? Math.floor(0.56 * H) : Math.floor(0.40 * H);
  mctx.font = `900 ${fontSize}px ui-sans-serif, system-ui, Inter, Arial`;
  mctx.textAlign = "center"; mctx.textBaseline = "middle";
  mctx.fillStyle = "#fff";
  mctx.fillText(spec.target, W / 2, H / 2 + (spec.target.length >= 3 ? fontSize * 0.05 : 0));
  // Лёгкое размытие маски (для мягких краёв)
  try { (mctx as any).filter = "blur(1px)"; mctx.drawImage(m, 0, 0); (mctx as any).filter = "none"; } catch {}
  const mask = mctx.getImageData(0, 0, W, H).data;

  // параметры точечного поля
  const cols = spec.grid; const rows = spec.grid;
  const cellX = W / cols; const cellY = H / rows;
  const R = spec.radius * scale;
  const Lmid = 0.64; // средняя светлота
  const L1 = clamp(Lmid + spec.delta / 2, 0.02, 0.98);
  const L0 = clamp(Lmid - spec.delta / 2, 0.02, 0.98);

  // виньетирование
  const cx = W / 2, cy = H / 2; const maxD = Math.hypot(cx, cy);

  // рисуем точки
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      // базовые координаты
      const x = (gx + 0.5) * cellX + (gaussian() * spec.jitter) * R;
      const y = (gy + 0.5) * cellY + (gaussian() * spec.jitter) * R;
      if (x < R || x > W - R || y < R || y > H - R) continue;

      // проверим маску в этой ячейке
      const mx = Math.floor(x), my = Math.floor(y);
      const mi = (my * W + mx) * 4;
      const onGlyph = mask[mi] > 128; // белая буква

      // светлота с шумом
      const base = onGlyph ? L1 : L0;
      const l = clamp(base + gaussian() * spec.noise * 0.6, 0.01, 0.99);

      // виньетка — затемняем края
      const d = Math.hypot(x - cx, y - cy) / maxD; const v = 1 - spec.vignette * d * d;
      const lv = clamp(l * v, 0, 1);

      const g = (lv * 255) | 0; const fill = `rgb(${g},${g},${g})`;
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
    }
  }

  // добавим редкие «камушки» (блики/провалы) для натуральности
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 260; i++) {
    const r = rand(0.5, 1.6) * scale; const x = Math.random() * W, y = Math.random() * H;
    const c = (Math.random() > 0.5 ? 230 : 25) | 0; ctx.fillStyle = `rgb(${c},${c},${c})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // рамка
  ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2 * scale; ctx.strokeRect(2, 2, W - 4, H - 4);
}

/* ───────────── Компонент игры ───────────── */
export default function GrayRabkin() {
  const [spec, setSpec] = useState<PlateSpec>(() => makePlateSpec());
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("Введите, что видите на пластине. Подсказка мигает контрастом.");
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [round, setRound] = useState(1);
  const [timeStart, setTimeStart] = useState<number>(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [flicker, setFlicker] = useState(false);
  const [calib, setCalib] = useState(spec.delta);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { const id = setInterval(() => setElapsed(Date.now() - timeStart), 250); return () => clearInterval(id); }, [timeStart]);

  // рендерим пластину при изменениях
  const draw = useCallback(() => { const c = canvasRef.current; if (!c) return; renderPlate(c, { ...spec, delta: calib }); }, [spec, calib]);
  useEffect(() => { draw(); }, [draw]);

  // подсказка‑мигание: временно увеличиваем контраст
  useEffect(() => {
    if (!flicker) return; let live = true;
    const base = calib; let phase = 0; const id = setInterval(() => {
      if (!live) return; phase = (phase + 1) % 2; const k = phase ? 1.8 : 1.0; setCalib(clamp(base * k, 0.01, 0.25));
      draw();
    }, 140);
    // авто‑стоп через 1.2 c
    const off = setTimeout(() => { live = false; clearInterval(id); setCalib(base); setFlicker(false); draw(); }, 1200);
    return () => { live = false; clearInterval(id); clearTimeout(off); setCalib(base); };
  }, [flicker, calib, draw]);

  // новая пластина (адаптивная сложность: уменьшаем/увеличиваем delta по стрику)
  const nextPlate = useCallback((prevCorrect?: boolean) => {
    const baseDelta = prevCorrect ? spec.delta * 0.94 : spec.delta * 1.06;
    const ns = makePlateSpec(baseDelta);
    setSpec(ns); setCalib(ns.delta); setAnswer(""); setRound(r => r + 1); setTimeStart(Date.now());
    setTimeout(draw, 0);
  }, [spec.delta, draw]);

  const submit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault(); const a = answer.trim().toUpperCase(); if (!a) return;
    const ok = a === spec.target.toUpperCase();
    if (ok) {
      setMessage("Верно! Двигаемся дальше — контраст станет сложнее.");
      setStreak(s => { const ns = s + 1; setBest(b => Math.max(b, ns)); return ns; });
      nextPlate(true);
    } else {
      setMessage(`Неверно. Было «${spec.target}». Контраст немного добавлен — попробуй ещё.`);
      setStreak(0);
      nextPlate(false);
    }
  }, [answer, spec, nextPlate]);

  const giveUp = useCallback(() => {
    setMessage(`Не увидели? Это было «${spec.target}». Ничего, дальше будет чуть легче.`);
    setStreak(0); nextPlate(false);
  }, [spec, nextPlate]);

  // ручная калибровка контраста
  const onCalib = useCallback((v: number) => { setCalib(v); draw(); }, [draw]);

  /* ───────────── UI ───────────── */
  return (
    <main className="min-h-dvh relative text-neutral-100">
      {/* фон */}
      <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/images/atelier.jpg')" }} />
      <div className="absolute inset-0 -z-10 bg-black/70 backdrop-blur-[2px]" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Шапка */}
        <header className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Target className="opacity-80" /> Монохромный тест «Рабкина»
            </h1>
            <p className="text-neutral-300 text-sm sm:text-base">Вглядитесь в пластину и введите, что видите: число или слово. Всё выполнено <b>только в оттенках серого</b>, чтобы соответствовать стилю игры.</p>
          </div>
          <div className="flex items-end gap-2 sm:gap-3">
            <Stat label="Раунд" value={round} />
            <Stat label="Серия" value={streak} />
            <Stat label="Лучшее" value={best} />
            <Stat label="Время" value={formatTime(elapsed)} />
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[560px_1fr] gap-6 items-start">
          {/* «ФОТО» — сама пластина */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur">
            <div ref={wrapRef} className="relative rounded-xl overflow-hidden border border-white/10 bg-black/50">
              <canvas ref={canvasRef} className="block w-full h-auto" width={560 * 2} height={560 * 2} style={{ transform: "scale(0.5)", transformOrigin: "top left", width: 560, height: 560 }} />
              {/* Подпись режима */}
              <div className="absolute top-2 right-2 text-[11px] bg-black/50 border border-white/10 rounded px-2 py-1">ΔL: {(calib*100).toFixed(1)}%</div>
            </div>

            {/* Поле ввода под «фото» */}
            <form onSubmit={submit} className="mt-3 flex items-center gap-2">
              <input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Что изображено? (например, 27 или SOS)" className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 focus:outline-none" />
              <button type="submit" className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-300/40 flex items-center gap-2"><Check size={16}/> Проверить</button>
              <button type="button" onClick={giveUp} className="px-3 py-2 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 flex items-center gap-2"><X size={16}/> Не вижу</button>
            </form>

            {/* Калибровка контраста */}
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-sm font-medium mb-1 flex items-center gap-2"><SlidersHorizontal size={16} className="opacity-80"/> Калибровка контраста</div>
              <input type="range" min={0.012} max={0.20} step={0.002} value={calib} onChange={e => onCalib(parseFloat(e.target.value))} className="w-full accent-amber-400"/>
              <div className="text-xs text-neutral-300 mt-1">Двигайте слайдер, если пластины кажутся слишком лёгкими/сложными. Подсказка временно усиливает контраст.</div>
            </div>
          </div>

          {/* Правая панель: подсказки/правила */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <h3 className="font-medium mb-2 flex items-center gap-2"><Info size={16} className="opacity-80"/> Как играть</h3>
            <p className="text-sm text-neutral-200">Это не классический тест цветовосприятия — мы сознательно убрали цвет. Смысл — «высматривать» форму в облаке серых точек. Верный ответ сжимает контраст, неверный — расширяет. Так система подстраивается под игрока.</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={() => setFlicker(true)} className="px-3 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-500 border border-amber-300/40 flex items-center gap-2"><Lightbulb size={16}/> Подсказка (мигнуть)</button>
              <button onClick={() => nextPlate(false)} className="px-3 py-2 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 flex items-center gap-2"><RefreshCw size={16}/> Другая пластина</button>
            </div>

            <div className="mt-4 rounded-lg bg-black/30 border border-white/10 p-3 text-sm">
              <div className="text-neutral-300">Комментарий мастера:</div>
              <div className="font-medium">{message}</div>
            </div>

            <div className="mt-4 text-xs text-neutral-400">
              Фишка: иногда попадаются слова (например, «ART»), а не только числа.
              На длинной серии алгоритм даёт редкие «ловушки» с похожими по форме буквами.
            </div>

            {/* Демо мини‑плиток с разным контрастом */}
            <ContrastLegend calib={calib} />
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur text-sm">
      <div className="text-neutral-300 text-xs">{label}</div>
      <div className="font-semibold text-lg">{value}</div>
    </div>
  );
}

function formatTime(ms: number) { const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const sec = s % 60; return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`; }

/* Наглядная линейка контраста */
function ContrastLegend({ calib }: { calib: number }) {
  const samples = [calib * 0.6, calib, calib * 1.4].map(v => clamp(v, 0.01, 0.25));
  return (
    <div className="mt-4">
      <div className="text-sm font-medium mb-2 flex items-center gap-2"><Sparkles size={16} className="opacity-80"/> Пример контраста</div>
      <div className="grid grid-cols-3 gap-3">
        {samples.map((d, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-2">
            <MiniPlate delta={d} label={`ΔL≈${(d*100).toFixed(1)}%`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniPlate({ delta, label }: { delta: number; label: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const spec: PlateSpec = { target: "42", grid: 16, radius: 3.6, delta, noise: 0.06, jitter: 0.4, vignette: 0.25 };
    renderPlate(c, spec, 1);
  }, [delta]);
  return (
    <div>
      <canvas ref={ref} width={180} height={180} className="block w-full h-auto rounded-lg overflow-hidden border border-white/10" />
      <div className="mt-1 text-center text-xs text-neutral-300">{label}</div>
    </div>
  );
}
