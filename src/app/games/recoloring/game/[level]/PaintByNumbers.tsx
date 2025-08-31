"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Paintbrush, Eye, Eraser, Undo2, Redo2, ZoomIn, ZoomOut, Lock, Unlock, Sparkles, Info, Download, Upload, RefreshCw, Lightbulb, Target, Trophy, Timer, Palette, Wand2, Camera, Image as ImageIcon } from "lucide-react";

/* =============================================================================
   PAINT BY NUMBERS — «Картина по номерам» (one‑file edition)
   ----------------------------------------------------------------------------
   • Адаптивный Canvas с панорамированием и зумом (wheel + кнопки)
   • Мозаика из треугольников (low‑poly), «почти‑ручная» за счёт джиттера
   • Несколько шаблонов сцен (закат/море/лаванда/город) + палитры HSL
   • Палитра с счётчиками: сколько клеток требуется/закрашено для каждого цвета
   • Кисть, заливка‑по‑клетке, ластик, пипетка; режим «строгий» (только верные)
   • Подсказки: подсветка незакрашенных областей выбранного номера, «следующий цвет»
   • Undo/Redo с глубиной 100; блокировка «верных» мазков; автосейв в localStorage
   • Конфетти + звёзды за идеал; оценка точности и времени, прогресс‑бар
   • Экспорт/импорт состояния как JSON; смена шаблона на лету
   • Красивый UI: стекло, фон‑фото, мягкие тени, микроподсказки
   ----------------------------------------------------------------------------
   Подключение: просто отрендерьте <PaintByNumbers />. Никаких внешних зависимостей.
   Tailwind CSS ожидается в проекте. Иконки — lucide-react (как и в остальных играх).
============================================================================= */

/* -------------------------------- Общие утилиты ---------------------------- */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const randN = (n: number, a: number, b: number) => Array.from({ length: n }, () => rand(a, b));

const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;

/* ------------------------------ Типы данных ------------------------------- */
export type HSL = { h: number; s: number; l: number };
export type Cell = {
  id: number;
  poly: { x: number; y: number }[]; // 3 точки (треугольник)
  centroid: { x: number; y: number };
  targetIdx: number;                 // номер цвета по палитре
  fillIdx: number | null;            // текущий цвет игрока
  locked: boolean;                   // закреплено верно
};
export type TemplateId = "sunset" | "ocean" | "lavender" | "city" | "custom";
export type Tool = "brush" | "bucket" | "eraser" | "picker";

/* -------------------------- Параметры движка ------------------------------ */
const GRID_W = 44;         // количество колонок пикетов (будет *2 триггеров)
const GRID_H = 28;         // строк
const JITTER = 0.23;       // джиттер вершин от идеально‑регулярной сетки
const TRI_PAD = 1.0;       // отступ (пикс) внутри треугольника для визуального зазора
const HIST_MAX = 100;      // лимит истории

/* ------------------------------- Палитры ---------------------------------- */
const paletteSunset: HSL[] = [
  { h: 12, s: 0.80, l: 0.50 }, // 1 алый
  { h: 22, s: 0.85, l: 0.55 }, // 2 оранжевый
  { h: 36, s: 0.90, l: 0.55 }, // 3 янтарный
  { h: 48, s: 0.90, l: 0.60 }, // 4 золотой
  { h: 210, s: 0.40, l: 0.40 }, // 5 серо‑лазурный
  { h: 260, s: 0.30, l: 0.24 }, // 6 сумрак
  { h: 0, s: 0.00, l: 0.95 },  // 7 белый блик
  { h: 0, s: 0.00, l: 0.08 },  // 8 глубокая тень
];

const paletteOcean: HSL[] = [
  { h: 195, s: 0.70, l: 0.55 }, // 1 бирюза
  { h: 205, s: 0.75, l: 0.50 }, // 2 океан
  { h: 215, s: 0.75, l: 0.45 }, // 3 морская синь
  { h: 230, s: 0.70, l: 0.50 }, // 4 индиго
  { h: 45, s: 0.85, l: 0.58 },  // 5 песок
  { h: 15, s: 0.75, l: 0.55 },  // 6 коралл
  { h: 220, s: 0.10, l: 0.92 }, // 7 пена
  { h: 230, s: 0.22, l: 0.14 }, // 8 глубина
];

const paletteLavender: HSL[] = [
  { h: 270, s: 0.50, l: 0.74 }, // 1 лавандовый светлый
  { h: 268, s: 0.55, l: 0.58 }, // 2 лиловый
  { h: 266, s: 0.58, l: 0.45 }, // 3 фиалка
  { h: 260, s: 0.66, l: 0.36 }, // 4 сумеречный фиолетовый
  { h: 90, s: 0.40, l: 0.60 },  // 5 трава
  { h: 40, s: 0.80, l: 0.60 },  // 6 солнце на горизонте
  { h: 0, s: 0.00, l: 0.95 },   // 7 облако
  { h: 260, s: 0.22, l: 0.10 }, // 8 ночь
];

const paletteCity: HSL[] = [
  { h: 210, s: 0.20, l: 0.75 }, // 1 небо
  { h: 210, s: 0.18, l: 0.58 }, // 2 голубой бетон
  { h: 210, s: 0.18, l: 0.42 }, // 3 фасад
  { h: 210, s: 0.20, l: 0.26 }, // 4 тени фасада
  { h: 40, s: 0.95, l: 0.56 },  // 5 окна‑свет
  { h: 15, s: 0.85, l: 0.54 },  // 6 неон/вывеска
  { h: 0, s: 0.00, l: 0.92 },   // 7 бликовая кромка
  { h: 0, s: 0.00, l: 0.10 },   // 8 глубокие тени
];

/* ----------------------------- Шаблоны сцен ------------------------------- */
function sceneMapper(id: TemplateId, x: number, y: number, cols: number, rows: number): number {
  // Возвращает индекс цвета [0..palette.length-1] по позиции (стилизация «картины»)
  const tx = x / Math.max(1, cols - 1);
  const ty = y / Math.max(1, rows - 1);
  switch (id) {
    case "sunset": {
      // небо (тёплый градиент), низ — тёмные горы/вода, белые блики «облака»
      if (ty > 0.78) return 7; // тёмная гряда
      if (ty > 0.70) return 5; // сумерки
      if (ty < 0.15) return 6; // облака‑блики
      const mix = lerp(1, 4, ty); // 1..4
      return Math.round(clamp(mix, 1, 4)) - 1; // 0..3
    }
    case "ocean": {
      if (ty < 0.25) return 6; // пена
      if (ty < 0.35) return 0; // бирюза
      if (ty < 0.50) return 1; // океан
      if (ty < 0.65) return 2; // морская синь
      if (ty > 0.80) return 7; // глубина
      if (tx < 0.25 && ty > 0.70) return 4; // песок слева
      if (tx > 0.7 && ty > 0.60) return 5;  // коралл справа
      return 3; // индиго общий
    }
    case "lavender": {
      if (ty < 0.20) return 6; // облако
      if (ty < 0.35) return 5; // солнце
      if (ty > 0.82) return 7; // ночь внизу
      // полосы лавандового поля
      const band = Math.floor(lerp(0, 3, ty));
      return [0, 1, 2, 3][band];
    }
    case "city": {
      if (ty < 0.35) return 0; // небо
      if (ty < 0.45) return 1; // голубой бетон верхний
      if (ty > 0.82) return 7; // тень внизу
      if ((x + y) % 7 === 0) return 4; // окна
      if ((x * 3 + y * 5) % 11 === 0) return 5; // неон
      const band = Math.floor(lerp(2, 3, ty));
      return band; // фасады
    }
    default:
      return Math.floor(Math.random() * 8);
  }
}

function getPaletteByTemplate(id: TemplateId): HSL[] {
  switch (id) {
    case "sunset": return paletteSunset;
    case "ocean": return paletteOcean;
    case "lavender": return paletteLavender;
    case "city": return paletteCity;
    default: return paletteSunset;
  }
}

/* -------------------------- Генерация мозаики ------------------------------ */
function makeGridPoints(cols: number, rows: number, jitter = JITTER) {
  const pts: { x: number; y: number }[] = [];
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
      const jx = (Math.random() * 2 - 1) * jitter;
      const jy = (Math.random() * 2 - 1) * jitter;
      pts.push({ x: x + jx, y: y + jy });
    }
  }
  return { pts, cols, rows };
}

function triAt(ix: number, iy: number, cols: number) {
  // Возвращает индексы вершин для двух треугольников ячейки (ix,iy)
  // Вершины храним построчно: index = y*(cols+1)+x
  const A = iy * (cols + 1) + ix;
  const B = A + 1;
  const C = A + (cols + 1);
  const D = C + 1;
  return [ [A, B, D], [A, D, C] ] as const;
}

function centroidOf(tri: { x: number; y: number }[]) {
  const [p0, p1, p2] = tri; return { x: (p0.x + p1.x + p2.x) / 3, y: (p0.y + p1.y + p2.y) / 3 };
}

function buildCells(template: TemplateId, cols = GRID_W, rows = GRID_H) {
  const { pts } = makeGridPoints(cols, rows);
  const cells: Cell[] = [];
  let id = 1;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tris = triAt(x, y, cols);
      for (const t of tris) {
        const triPts = t.map(i => pts[i]);
        const cent = centroidOf(triPts);
        const targetIdx = sceneMapper(template, x, y, cols, rows);
        cells.push({ id: id++, poly: triPts, centroid: cent, targetIdx, fillIdx: null, locked: false });
      }
    }
  }
  return cells;
}

/* ------------------------- Геометрия/хит‑тест ------------------------------ */
function pointInTriangle(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  // barycentric technique
  const v0x = c.x - a.x, v0y = c.y - a.y;
  const v1x = b.x - a.x, v1y = b.y - a.y;
  const v2x = p.x - a.x, v2y = p.y - a.y;
  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;
  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01 + 1e-9);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
  return u >= 0 && v >= 0 && u + v <= 1;
}

/* ------------------------------ История ------------------------------------ */
type HistOp = { id: number; prev: number | null; next: number | null; lockedPrev: boolean; lockedNext: boolean };

/* ------------------------------ LocalStorage ------------------------------- */
const STORAGE_KEY = "paintbynumbers.save";

function saveState(data: any) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}
function loadState(): any | null {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

/* --------------------------- Компонент игры -------------------------------- */
export default function PaintByNumbers() {
  const [template, setTemplate] = useState<TemplateId>("sunset");
  const [cells, setCells] = useState<Cell[]>(() => buildCells("sunset"));
  const [palette, setPalette] = useState<HSL[]>(() => getPaletteByTemplate("sunset"));

  const [tool, setTool] = useState<Tool>("brush");
  const [strict, setStrict] = useState(true);          // только верные номера
  const [lockCorrect, setLockCorrect] = useState(true); // закреплять верно закрашенные

  const [currentIdx, setCurrentIdx] = useState<number>(0); // выбранный номер палитры

  const [zoom, setZoom] = useState(1.0);  // масштаб
  const [pan, setPan] = useState({ x: 0, y: 0 }); // смещение
  const [isPanning, setIsPanning] = useState(false);

  const [hoverId, setHoverId] = useState<number | null>(null);

  const [hist, setHist] = useState<HistOp[]>([]);
  const [histPos, setHistPos] = useState(-1);

  const [startedAt, setStartedAt] = useState<number>(() => Date.now());
  const [elapsed, setElapsed] = useState<number>(0);
  const [completed, setCompleted] = useState(false);

  const [message, setMessage] = useState("Выберите номер и закрашивайте треугольники. В строгом режиме засчитываются только верные попадания.");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null); // для номеров/подсветки
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Таймер времени
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  // Регенерация сцены при смене шаблона
  useEffect(() => {
    const cs = buildCells(template);
    setCells(cs);
    setPalette(getPaletteByTemplate(template));
    setCurrentIdx(0);
    setHist([]); setHistPos(-1); setCompleted(false);
    setStartedAt(Date.now());
  }, [template]);

  // Автосейв
  useEffect(() => {
    const payload = { template, cells, palette, strict, lockCorrect, currentIdx, zoom, pan, startedAt };
    saveState(payload);
  }, [template, cells, palette, strict, lockCorrect, currentIdx, zoom, pan, startedAt]);

  // Попытка загрузки при монтировании
  useEffect(() => {
    const data = loadState();
    if (data && data.template) {
      setTemplate(data.template);
      setCells(data.cells);
      setPalette(data.palette);
      setStrict(Boolean(data.strict));
      setLockCorrect(Boolean(data.lockCorrect));
      setCurrentIdx(Number(data.currentIdx) || 0);
      setZoom(Number(data.zoom) || 1);
      setPan(data.pan || { x: 0, y: 0 });
      setStartedAt(data.startedAt || Date.now());
    }
  }, []);

  // Размеры канваса
  const [cw, ch] = useContainerSize(wrapRef);

  // Рендеринг
  useEffect(() => {
    drawScene(canvasRef.current, cw, ch, cells, palette, currentIdx, hoverId, zoom, pan, strict);
    drawOverlay(overlayRef.current, cw, ch, cells, palette, zoom, pan, strict, currentIdx);
  }, [cells, palette, currentIdx, hoverId, cw, ch, zoom, pan, strict]);

  // Прогресс
  const progress = useMemo(() => {
    const total = cells.length;
    const done = cells.filter(c => c.fillIdx !== null && (!strict || c.fillIdx === c.targetIdx)).length;
    return { done, total, pct: Math.round((done / Math.max(1, total)) * 100) };
  }, [cells, strict]);

  useEffect(() => {
    if (progress.done === progress.total && progress.total > 0 && !completed) {
      setCompleted(true);
      setMessage("Идеально! Картина завершена. Сохраните результат или начните новый шаблон.");
      confetti(overlayRef.current, cw, ch);
    }
  }, [progress, completed, cw, ch]);

  // Палитра: счётчики сколько нужно/сколько покрашено
  const paletteStats = useMemo(() => {
    const need = new Array(palette.length).fill(0);
    const have = new Array(palette.length).fill(0);
    for (const c of cells) { need[c.targetIdx]++; if (c.fillIdx !== null) have[c.fillIdx]++; }
    return { need, have };
  }, [cells, palette.length]);

  // Обработчики инструментов
  const worldToCellPoint = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return null;
    const x = (clientX - rect.left); const y = (clientY - rect.top);
    const wx = (x - pan.x) / zoom; const wy = (y - pan.y) / zoom; // перевод в мировые
    return { x: wx, y: wy };
  }, [pan, zoom]);

  const hitCell = useCallback((pt: { x: number; y: number }) => {
    // Ожидаем, что «мир» ~ GRID_W x GRID_H клеток, но мы рисуем в натуральных координатах треугольников (0..cols,0..rows)
    // Здесь клетки уже в мировых координатах (buildCells), так что просто перебор (достаточно быстро для 2*44*28 ≈ 2464 триггеров)
    for (let i = cells.length - 1; i >= 0; i--) { // сверху вниз
      const c = cells[i]; const [a, b, d] = c.poly as any; // треугольники
      if (pointInTriangle(pt, a, b, d)) return c;
    }
    return null;
  }, [cells]);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (isPanning) return; // панорамирование
    const p = worldToCellPoint(e.clientX, e.clientY); if (!p) return;
    const hit = hitCell(p); setHoverId(hit?.id || null);
    if (e.buttons & 1) {
      // рисуем/кликаем при зажатой ЛКМ
      if (tool === "brush" || tool === "bucket") tryFill(hit?.id || null, currentIdx);
      else if (tool === "eraser") tryFill(hit?.id || null, null);
    }
  }, [worldToCellPoint, hitCell, tool, currentIdx, isPanning]);

  const onDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) { setIsPanning(true); return; }
    const p = worldToCellPoint(e.clientX, e.clientY); if (!p) return;
    if (tool === "picker") {
      const hit = hitCell(p); if (hit) { setCurrentIdx((hit.fillIdx ?? hit.targetIdx) || 0); setTool("brush"); setMessage("Пипетка: выбран номер цвета."); }
      return;
    }
    const hit = hitCell(p); if (!hit) return;
    if (tool === "brush" || tool === "bucket") tryFill(hit.id, currentIdx);
    if (tool === "eraser") tryFill(hit.id, null);
  }, [worldToCellPoint, hitCell, tool, currentIdx]);

  const onUp = useCallback(() => setIsPanning(false), []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const delta = -e.deltaY; const factor = delta > 0 ? 1.08 : 0.92; const nz = clamp(zoom * factor, 0.5, 3);
    // зум относительно курсора
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const cx = e.clientX - rect.left; const cy = e.clientY - rect.top;
    const wx = (cx - pan.x) / zoom; const wy = (cy - pan.y) / zoom;
    const nx = wx * nz + pan.x; const ny = wy * nz + pan.y;
    setPan({ x: cx - wx * nz, y: cy - wy * nz });
    setZoom(nz);
  }, [zoom, pan]);

  const tryFill = useCallback((cellId: number | null, colorIdx: number | null) => {
    if (!cellId) return;
    setCells(prev => {
      const idx = prev.findIndex(c => c.id === cellId); if (idx < 0) return prev;
      const c = prev[idx];
      if (strict && colorIdx !== null && colorIdx !== c.targetIdx) {
        // В строгом режиме неверные ходы игнорируются
        setMessage("Строго: выберите правильный номер для этой области.");
        return prev;
      }
      if (lockCorrect && c.locked && colorIdx !== c.fillIdx) {
        setMessage("Клетка закреплена как верная. Разблокируйте, чтобы изменить.");
        return prev;
      }
      const next = [...prev];
      const before = { ...c };
      const filled = { ...c, fillIdx: colorIdx } as Cell;
      if (lockCorrect && colorIdx === c.targetIdx) filled.locked = true;
      next[idx] = filled;
      // История
      pushHist({ id: c.id, prev: before.fillIdx, next: filled.fillIdx, lockedPrev: before.locked, lockedNext: filled.locked });
      return next;
    });
  }, [strict, lockCorrect]);

  function pushHist(op: HistOp) {
    setHist(h => {
      const sliced = h.slice(0, histPos + 1).concat(op);
      if (sliced.length > HIST_MAX) sliced.shift();
      setHistPos(sliced.length - 1);
      return sliced;
    });
  }

  const undo = useCallback(() => {
    setHistPos(pos => {
      if (pos < 0) return pos; const op = hist[pos];
      setCells(prev => {
        const i = prev.findIndex(c => c.id === op.id); if (i < 0) return prev;
        const next = [...prev]; next[i] = { ...next[i], fillIdx: op.prev, locked: op.lockedPrev }; return next;
      });
      return pos - 1;
    });
  }, [hist]);

  const redo = useCallback(() => {
    setHistPos(pos => {
      const op = hist[pos + 1]; if (!op) return pos;
      setCells(prev => {
        const i = prev.findIndex(c => c.id === op.id); if (i < 0) return prev;
        const next = [...prev]; next[i] = { ...next[i], fillIdx: op.next, locked: op.lockedNext }; return next;
      });
      return pos + 1;
    });
  }, [hist]);

  // Подсказка: подсветить n незакрашенных нужного цвета
  const [hintPulse, setHintPulse] = useState<number[]>([]);
  const hint = useCallback((mode: "current" | "next") => {
    const target = mode === "current" ? currentIdx : findMostNeededIndex(cells, palette.length);
    const ids = cells.filter(c => c.targetIdx === target && c.fillIdx !== target).slice(0, 24).map(c => c.id);
    setHintPulse(ids); setTimeout(() => setHintPulse([]), 1400);
  }, [cells, currentIdx, palette.length]);

  const exportJSON = useCallback(() => {
    const data = { template, cells, palette, strict, lockCorrect, currentIdx, zoom, pan, startedAt };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `paintbynumbers_${template}_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  }, [template, cells, palette, strict, lockCorrect, currentIdx, zoom, pan, startedAt]);

  const importJSON = useCallback((file: File) => {
    const fr = new FileReader(); fr.onload = () => {
      try {
        const data = JSON.parse(String(fr.result));
        if (!data.cells || !data.palette) throw new Error("bad file");
        setTemplate(data.template || "sunset");
        setCells(data.cells); setPalette(data.palette);
        setStrict(Boolean(data.strict)); setLockCorrect(Boolean(data.lockCorrect));
        setCurrentIdx(Number(data.currentIdx) || 0); setZoom(Number(data.zoom) || 1); setPan(data.pan || { x: 0, y: 0 });
        setStartedAt(data.startedAt || Date.now()); setHist([]); setHistPos(-1);
      } catch {
        alert("Не удалось импортировать файл");
      }
    }; fr.readAsText(file);
  }, []);

  // Сброс
  const reset = useCallback(() => {
    if (!confirm("Начать заново? Несохранённый прогресс будет потерян.")) return;
    setCells(buildCells(template)); setCurrentIdx(0); setHist([]); setHistPos(-1); setCompleted(false); setStartedAt(Date.now());
  }, [template]);

  // Управления масштабом
  const zoomIn = () => setZoom(z => clamp(z * 1.15, 0.5, 3));
  const zoomOut = () => setZoom(z => clamp(z / 1.15, 0.5, 3));

  /* --------------------------------- UI ----------------------------------- */
  return (
    <main className="min-h-dvh relative text-neutral-100">
      {/* Фон‑фото мастерской */}
      <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/images/atelier.jpg')" }} />
      <div className="absolute inset-0 -z-10 bg-black/70 backdrop-blur-[2px]" />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8">
        {/* Шапка */}
        <header className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Palette className="opacity-80" /> Картина по номерам
            </h1>
            <p className="text-neutral-300 text-sm sm:text-base">
              Выберите номер и закрашивайте треугольники. В <b>строгом режиме</b> засчитываются только верные попадания; верные клетки можно <b>закреплять</b>.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <Stat label="Прогресс" value={`${progress.pct}%`} />
            <Stat label="Время" value={formatTime(elapsed)} icon={<Timer size={16} />} />
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur text-sm">
              <div className="text-neutral-300 text-xs">Шаблон</div>
              <select className="bg-transparent text-neutral-100 text-sm focus:outline-none" value={template} onChange={e => setTemplate(e.target.value as TemplateId)}>
                <option value="sunset">Закат и горы</option>
                <option value="ocean">Ночное море</option>
                <option value="lavender">Поле лаванды</option>
                <option value="city">Ночной город</option>
              </select>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
          {/* ЛЕВО: Полотно */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <ToolbarButton active={tool === "brush"} onClick={() => setTool("brush")} icon={<Paintbrush size={16} />} label="Кисть" />
                <ToolbarButton active={tool === "bucket"} onClick={() => setTool("bucket")} icon={<ImageIcon size={16} />} label="Заливка" />
                <ToolbarButton active={tool === "eraser"} onClick={() => setTool("eraser")} icon={<Eraser size={16} />} label="Ластик" />
                <ToolbarButton active={tool === "picker"} onClick={() => setTool("picker")} icon={<Eye size={16} />} label="Пипетка" />
                <div className="mx-2 h-6 w-px bg-white/15" />
                <ToolbarButton onClick={undo} icon={<Undo2 size={16} />} label="Отменить" />
                <ToolbarButton onClick={redo} icon={<Redo2 size={16} />} label="Повторить" />
                <div className="mx-2 h-6 w-px bg-white/15" />
                <ToolbarButton onClick={zoomOut} icon={<ZoomOut size={16} />} label="−" />
                <ToolbarButton onClick={zoomIn} icon={<ZoomIn size={16} />} label="+" />
                <span className="text-xs text-neutral-300">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-neutral-300">
                  <input type="checkbox" className="accent-amber-400" checked={strict} onChange={e => setStrict(e.target.checked)} /> Строго
                </label>
                <label className="flex items-center gap-1 text-xs text-neutral-300">
                  <input type="checkbox" className="accent-amber-400" checked={lockCorrect} onChange={e => setLockCorrect(e.target.checked)} /> Закреплять
                </label>
                <div className="mx-2 h-6 w-px bg-white/15" />
                <ToolbarButton onClick={() => hint("current")} icon={<Lightbulb size={16} />} label="Подсказка" />
                <ToolbarButton onClick={() => hint("next")} icon={<Wand2 size={16} />} label="След.цвет" />
                <ToolbarButton onClick={reset} icon={<RefreshCw size={16} />} label="Сброс" />
              </div>
            </div>

            {/* Канвасы */}
            <div ref={wrapRef} className="relative w-full overflow-hidden rounded-xl border border-white/10" onContextMenu={e => e.preventDefault()}>
              <canvas ref={canvasRef} className="block w-full h-auto select-none" width={cw} height={ch}
                onPointerMove={onMove} onPointerDown={onDown} onPointerUp={onUp} onPointerLeave={onUp} onWheel={onWheel}
                style={{ touchAction: "none", cursor: tool === "picker" ? "crosshair" : isPanning ? "grabbing" : "pointer" }}
              />
              <canvas ref={overlayRef} className="pointer-events-none absolute inset-0" width={cw} height={ch} />
              {/* Пульсации подсказки */}
              {hintPulse.length > 0 && (
                <PulseLayer ids={hintPulse} cells={cells} zoom={zoom} pan={pan} />
              )}
            </div>

            {/* Микроподсказка */}
            <div className="text-xs text-neutral-300 mt-2">
              Подсказка: зажмите <b>Shift</b> или среднюю кнопку — панорамирование, колесо — зум к курсору.
            </div>
          </div>

          {/* ПРАВО: Палитра/статусы */}
          <aside className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
              <h3 className="font-medium mb-2 flex items-center gap-2"><Target size={16} className="opacity-80"/> Палитра номеров</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {palette.map((c, i) => (
                  <button key={i} onClick={() => setCurrentIdx(i)}
                    className={`rounded-xl border p-2 text-left ${currentIdx === i ? "border-amber-300/60 bg-white/10" : "border-white/10 bg-white/5"}`}>
                    <div className="h-10 w-full rounded-md border border-white/10" style={{ background: hsl(c.h, c.s, c.l) }} />
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span>№{i + 1}</span>
                      <span className="text-neutral-300">{paletteStats.have[i]}/{paletteStats.need[i]}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
              <h3 className="font-medium mb-2 flex items-center gap-2"><Info size={16} className="opacity-80"/> Комментарий мастера</h3>
              <p className="text-sm leading-relaxed">{message}</p>
              <div className="mt-3 text-xs text-neutral-400">{strict ? "Строгий режим: засчитываются только верные номера." : "Свободный режим: можно красить любым номером, но прогресс учитывает только совпадения."}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
              <h3 className="font-medium mb-2 flex items-center gap-2"><Sparkles size={16} className="opacity-80"/> Экспорт/импорт</h3>
              <div className="flex items-center gap-2">
                <button onClick={exportJSON} className="px-3 py-2 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 text-sm"><Download size={16} className="inline -mt-0.5 mr-1"/> Экспорт</button>
                <label className="px-3 py-2 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 text-sm cursor-pointer">
                  <Upload size={16} className="inline -mt-0.5 mr-1"/> Импорт
                  <input type="file" accept="application/json" className="hidden" onChange={e => e.target.files && importJSON(e.target.files[0])} />
                </label>
              </div>
            </div>

            {/* Итог */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3">
              <h3 className="font-medium mb-2 flex items-center gap-2"><Trophy size={16} className="opacity-80"/> Статус</h3>
              <div className="text-sm">{completed ? "Картина завершена!" : "Ещё есть что раскрасить."}</div>
              <div className="w-full h-2 bg-white/10 rounded mt-2 overflow-hidden"><div className="h-full bg-emerald-400/80" style={{ width: `${progress.pct}%` }} /></div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ----------------------- Рендеринг сцены и оверлея ------------------------ */
function drawScene(canvas: HTMLCanvasElement | null, cw: number, ch: number, cells: Cell[], palette: HSL[], currentIdx: number, hoverId: number | null, zoom: number, pan: { x: number; y: number }, strict: boolean) {
  if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return;
  ctx.clearRect(0, 0, cw, ch);

  // фон — мягкая «стена» с градиентом
  const g = ctx.createLinearGradient(0, 0, 0, ch);
  g.addColorStop(0, "#0e0f12"); g.addColorStop(1, "#171a1f");
  ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);

  ctx.save();
  ctx.translate(pan.x, pan.y); ctx.scale(zoom, zoom);

  // тени от мозаики
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;

  for (const c of cells) {
    const t = c.poly; ctx.beginPath(); ctx.moveTo(t[0].x, t[0].y); ctx.lineTo(t[1].x, t[1].y); ctx.lineTo(t[2].x, t[2].y); ctx.closePath();
    // фон ячейки — слегка темнее целевого, если пустая
    const base = palette[c.targetIdx];
    const fill = c.fillIdx !== null ? palette[c.fillIdx] : { h: base.h, s: Math.max(0, base.s - 0.25), l: Math.max(0, base.l - 0.12) };
    ctx.fillStyle = hsl(fill.h, fill.s, fill.l);
    ctx.fill();

    // внутренний отступ (чтобы были «швы»)
    ctx.strokeStyle = "rgba(0,0,0,0.65)"; ctx.lineWidth = TRI_PAD; ctx.stroke();

    // hover‑подсветка
    if (hoverId === c.id) {
      ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = "#fde68a"; ctx.fill(); ctx.restore();
    }

    // индикатор «закреплено»
    if (c.locked) {
      ctx.save(); ctx.globalAlpha = 0.20; ctx.fillStyle = "#10b981"; ctx.fill(); ctx.restore();
    }
  }

  ctx.restore();
}

function drawOverlay(canvas: HTMLCanvasElement | null, cw: number, ch: number, cells: Cell[], palette: HSL[], zoom: number, pan: { x: number; y: number }, strict: boolean, currentIdx: number) {
  if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return;
  ctx.clearRect(0, 0, cw, ch);

  ctx.save(); ctx.translate(pan.x, pan.y); ctx.scale(zoom, zoom);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const c of cells) {
    const { x, y } = c.centroid; const num = c.targetIdx + 1;
    // номер рисуем, если пусто или включён строгий режим (помогает наводиться)
    if (c.fillIdx === null || strict) {
      // полу‑прозрачный номер
      const dark = isLight(palette[c.targetIdx]) ? "#0b0b0b" : "#ffffff";
      ctx.font = `${Math.max(8, Math.min(14, 12))}px ui-sans-serif, system-ui`;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = dark;
      ctx.fillText(String(num), x, y);
      ctx.globalAlpha = 1;
    }

    // контур (тонкий) для читаемости
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 0.5;
    ctx.beginPath(); const t = c.poly; ctx.moveTo(t[0].x, t[0].y); ctx.lineTo(t[1].x, t[1].y); ctx.lineTo(t[2].x, t[2].y); ctx.closePath(); ctx.stroke();

    // если выбран номер — точечная подсветка нужных пустых областей
    if (currentIdx === c.targetIdx && c.fillIdx !== c.targetIdx) {
      ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = "#f59e0b"; ctx.fill(); ctx.restore();
    }
  }
  ctx.restore();
}

function isLight(col: HSL) { return col.l > 0.6; }

/* ------------------------------ Подсветка hint ----------------------------- */
function PulseLayer({ ids, cells, zoom, pan }: { ids: number[]; cells: Cell[]; zoom: number; pan: { x: number; y: number } }) {
  return (
    <svg className="pointer-events-none absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
      {ids.map(id => {
        const c = cells.find(c => c.id === id)!; const { x, y } = c.centroid; return (
          <circle key={id} cx={x} cy={y} r={10} fill="none" stroke="#f59e0b" strokeWidth={2} className="animate-ping" />
        );
      })}
    </svg>
  );
}

/* ------------------------------- Хелперы UI ------------------------------- */
function Stat({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur text-sm">
      <div className="text-neutral-300 text-xs flex items-center gap-1">{icon}{label}</div>
      <div className="font-semibold text-lg">{value}</div>
    </div>
  );
}

function ToolbarButton({ active, onClick, icon, label }: { active?: boolean; onClick?: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-xl border text-sm ${active ? "bg-white/10 border-amber-300/60" : "bg-black/30 border-white/10 hover:bg-black/20"}`}>
      <span className="inline-flex items-center gap-2">{icon} {label}</span>
    </button>
  );
}

/* ------------------------------ Полезные утилы ---------------------------- */
function useContainerSize<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  const [size, setSize] = React.useState<[number, number]>([960, 600]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize([
        Math.max(640, Math.floor(r.width)),
        Math.max(420, Math.floor(r.width * 0.6)),
      ]);
    });

    ro.observe(el);            // HTMLDivElement совместим с Element
    return () => ro.disconnect();
  }, [ref]);

  return size;
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const sec = s % 60; return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

function findMostNeededIndex(cells: Cell[], n: number) {
  const need = new Array(n).fill(0); const have = new Array(n).fill(0);
  for (const c of cells) { need[c.targetIdx]++; if (c.fillIdx !== null) have[c.fillIdx]++; }
  let best = 0, bestDelta = -Infinity; for (let i = 0; i < n; i++) { const d = need[i] - have[i]; if (d > bestDelta) { bestDelta = d; best = i; } }
  return best;
}

/* ------------------------------- Конфетти ---------------------------------- */
function confetti(canvas: HTMLCanvasElement | null, cw: number, ch: number) {
  if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return;
  const pieces = Array.from({ length: 120 }, () => ({ x: Math.random() * cw, y: -20 - Math.random() * 80, r: rand(2, 4), vx: rand(-0.6, 0.6), vy: rand(1.2, 2.6), hue: rand(0, 360) }));
  let frame = 0; const id = setInterval(() => {
    frame++; ctx.clearRect(0, 0, cw, ch);
    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.02; if (p.y > ch + 10) p.y = -10, p.x = Math.random() * cw;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `hsl(${Math.round(p.hue + frame)} 90% 60%)`; ctx.fill();
    }
    if (frame > 240) { clearInterval(id); }
  }, 16);
}
