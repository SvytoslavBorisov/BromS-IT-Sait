"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Wand2, Info, Target, RefreshCw, Lightbulb, ArrowRight, Grid, Sparkles, CircleDot } from "lucide-react";

/* --------------------------------------------------------------------------
  ОБЩИЕ УТИЛИТЫ ЦВЕТА И ТЕКСТА
---------------------------------------------------------------------------- */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mod360 = (x: number) => ((x % 360) + 360) % 360;
const hslCss = (h: number, s: number, l: number) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
function hueDeltaDeg(a: number, b: number) { const d = Math.abs(mod360(a) - mod360(b)) % 360; return d > 180 ? 360 - d : d; }
function signedHueDelta(from: number, to: number) { return ((to - from + 540) % 360) - 180; }
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);

function hueName(h: number) {
  const ranges: Array<[number, string]> = [
    [0, "алый"], [15, "красно-оранжевый"], [30, "оранжевый"], [45, "янтарный"],
    [60, "жёлтый"], [90, "лаймовый"], [120, "зелёный"], [150, "бирюзоватый"],
    [180, "бирюзовый"], [210, "лазурный"], [240, "синий"], [270, "фиолетовый"],
    [300, "пурпурный"], [330, "малиновый"], [360, "алый"],
  ];
  const x = mod360(h);
  let last = ranges[0][1];
  for (const [deg, name] of ranges) if (x >= deg) last = name;
  return last;
}
const satWord = (s: number) => (s < 0.18 ? "приглушённый" : s < 0.45 ? "мягкий" : s < 0.75 ? "насыщенный" : "сочный");
const lightWord = (l: number) => (l < 0.18 ? "очень тёмный" : l < 0.35 ? "тёмный" : l < 0.65 ? "средний по светлоте" : l < 0.85 ? "светлый" : "очень светлый");
function tempWord(h: number) { const x = mod360(h); return x <= 60 || x >= 330 ? "тёплый" : x >= 180 && x <= 260 ? "холодный" : "нейтральный"; }
const humanDesc = (h: number, s: number, l: number) => `${tempWord(h)} ${hueName(h)}, ${satWord(s)}, ${lightWord(l)}`;

/* ==========================================================================
   1) ИГРА «ЦВЕТОВОЙ ШИФР» — подпольная типография
   Крутите кольца (Hue) + два ползунка S/L, добейтесь точного совпадения 0.000.
   Гарантия 0.000: цель вычисляется из секретного решения; подсказка фиксирует
   один из параметров на правильное значение.
============================================================================ */
export function ColorCipher() {
  // Конфиг колец
  const RINGS = 4; // 4 кольца по Hue
  const STEPS = 24; // дискретность
  const stepToHue = (i: number) => (i * 360) / STEPS;

  // Секретное решение — генерим единожды
  const solution = useMemo(() => {
    const rings = Array.from({ length: RINGS }, () => Math.floor(Math.random() * STEPS));
    const s = 0.55 + Math.random() * 0.35; // 0.55..0.9
    const l = 0.35 + Math.random() * 0.3;  // 0.35..0.65
    // Смешивание: средний Hue через вектор, S/L средние + калибровка
    const angles = rings.map(stepToHue).map(a => (a * Math.PI) / 180);
    const vx = angles.reduce((acc, ang) => acc + Math.cos(ang), 0);
    const vy = angles.reduce((acc, ang) => acc + Math.sin(ang), 0);
    const H = (Math.atan2(vy, vx) * 180) / Math.PI;
    const baseS = s; const baseL = l;
    return { rings, s: baseS, l: baseL, target: { h: mod360(H), s: baseS, l: baseL } };
  }, []);

  // Текущее состояние — инициализируем «сбитыми» значениями
  const [rings, setRings] = useState<number[]>(() => solution.rings.map(v => (v + Math.floor(Math.random() * 5) + 1) % STEPS));
  const [sat, setSat] = useState(() => clamp(solution.s + (Math.random() * 0.2 - 0.1), 0.1, 0.95));
  const [lit, setLit] = useState(() => clamp(solution.l + (Math.random() * 0.2 - 0.1), 0.1, 0.95));
  const [locks, setLocks] = useState<{ ring?: number; s?: boolean; l?: boolean }>({});
  const [message, setMessage] = useState("Соберите шифр: добейтесь точного совпадения цвета.");

  // Текущий цвет из состояния
  const result = useMemo(() => {
    const angles = rings.map(stepToHue).map(a => (a * Math.PI) / 180);
    const vx = angles.reduce((acc, ang) => acc + Math.cos(ang), 0);
    const vy = angles.reduce((acc, ang) => acc + Math.sin(ang), 0);
    const H = mod360((Math.atan2(vy, vx) * 180) / Math.PI);
    return { h: H, s: sat, l: lit };
  }, [rings, sat, lit]);

  // «Дистанция» (внутренняя метрика)
  const distance = useMemo(() => {
    const dh = hueDeltaDeg(result.h, solution.target.h) / 180;
    const ds = Math.abs(result.s - solution.target.s);
    const dl = Math.abs(result.l - solution.target.l);
    return Math.sqrt(dh * dh * 1.2 + ds * ds * 1.0 + dl * dl * 0.9);
  }, [result, solution.target]);

  const ideal = distance <= 1e-12;

  // Подсказка: фиксируем один неверный параметр
  const nudge = useCallback(() => {
    if (!locks.s && Math.abs(sat - solution.s) > 0.005) { setSat(solution.s); setLocks(v => ({ ...v, s: true })); setMessage("Зафиксирована насыщенность."); return; }
    if (!locks.l && Math.abs(lit - solution.l) > 0.005) { setLit(solution.l); setLocks(v => ({ ...v, l: true })); setMessage("Зафиксирована светлота."); return; }
    const wrong = solution.rings.findIndex((r, i) => r !== rings[i]);
    if (wrong >= 0 && locks.ring !== wrong) { const next = [...rings]; next[wrong] = solution.rings[wrong]; setRings(next); setLocks(v => ({ ...v, ring: wrong })); setMessage(`Кольцо ${wrong + 1} выставлено правильно.`); return; }
    setMessage("Похоже, всё уже почти идеально.");
  }, [sat, lit, rings, solution, locks]);

  const reset = useCallback(() => {
    setRings(solution.rings.map(v => (v + Math.floor(Math.random() * 5) + 1) % STEPS));
    setSat(clamp(solution.s + (Math.random() * 0.2 - 0.1), 0.1, 0.95));
    setLit(clamp(solution.l + (Math.random() * 0.2 - 0.1), 0.1, 0.95));
    setLocks({});
    setMessage("Новая комбинация. Крутите кольца и подстройте S/L.");
  }, [solution]);

  // UI
  return (
    <section className="relative">
      <Header title="Цветовой шифр — подпольная типография" subtitle="Крутите кольца (Hue) и подстройте насыщенность и светлоту. Цель — идеальное совпадение 0.000." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Референс */}
        <Card>
          <h3 className="font-medium mb-3 flex items-center gap-2"><Target size={18} className="opacity-70"/> Референс</h3>
          <Swatch color={solution.target} borderAccent={ideal ? "emerald" : undefined} height="h-48" />
          <div className="mt-2 text-sm">
            <div className="text-neutral-300">По‑человечески:</div>
            <div className="font-medium">{humanDesc(solution.target.h, solution.target.s, solution.target.l)}</div>
          </div>
        </Card>

        {/* Текущий */}
        <Card>
          <h3 className="font-medium mb-3 flex items-center gap-2"><CircleDot size={18} className="opacity-70"/> Текущий</h3>
          <Swatch color={result} borderAccent={ideal ? "emerald" : undefined} height="h-48" />
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <InfoBox label="Δ" value={distance.toFixed(3)} highlight={ideal} />
            <InfoBox label="Описание" value={humanDesc(result.h, result.s, result.l)} mono={false} />
          </div>
        </Card>

        {/* Подсказки */}
        <Card>
          <h3 className="font-medium mb-3 flex items-center gap-2"><Wand2 size={18} className="opacity-70"/> Комментарий мастера</h3>
          <p className="text-sm">{message}</p>
          <div className="mt-4 flex gap-2">
            <button onClick={nudge} className="px-3 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-500 border border-amber-300/40 text-sm">Подсказка</button>
            <button onClick={reset} className="px-3 py-2 rounded-xl bg-black/40 hover:bg-black/30 border border-white/10 text-sm"><RefreshCw size={16} className="inline -mt-0.5 mr-1"/> Сброс</button>
          </div>
        </Card>
      </div>

      {/* КОЛЬЦА И ПОЛЗУНКИ */}
      <Card className="mt-6">
        <h3 className="font-medium mb-3">Кольца (Hue) и параметры</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {rings.map((v, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-sm mb-1">Кольцо {i + 1}</div>
              <div className="h-10 w-full rounded-xl overflow-hidden border border-white/10 relative"
                   style={{ background: `conic-gradient(from 0deg, ${Array.from({length:STEPS}).map((_,k)=>hslCss(stepToHue(k), 0.9, 0.5)).join(',')})` }}>
                <div className="absolute inset-0 backdrop-blur-[1px] bg-black/20"/>
                <div className="absolute inset-y-0" style={{ left: `${(v/Math.max(1,STEPS-1))*100}%` }}>
                  <div className="w-0.5 h-full bg-white/80"/>
                </div>
              </div>
              <input type="range" min={0} max={STEPS-1} step={1} value={v} onChange={e => {
                const nv = parseInt(e.target.value,10); const next=[...rings]; next[i]=nv; setRings(next);
              }} className="mt-2 w-full accent-amber-400"/>
            </div>
          ))}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm mb-1">Насыщенность</div>
            <div className="h-10 rounded-xl border border-white/10" style={{ background: `linear-gradient(90deg, ${hslCss(result.h,0.05,result.l)}, ${hslCss(result.h,1,result.l)})` }}/>
            <input type="range" min={0} max={100} step={1} value={Math.round(sat*100)} onChange={e=>setSat(parseInt(e.target.value,10)/100)} className="mt-2 w-full accent-amber-400"/>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-sm mb-1">Светлота</div>
            <div className="h-10 rounded-xl border border-white/10" style={{ background: `linear-gradient(90deg, ${hslCss(result.h,sat,0.05)}, ${hslCss(result.h,sat,0.95)})` }}/>
            <input type="range" min={0} max={100} step={1} value={Math.round(lit*100)} onChange={e=>setLit(parseInt(e.target.value,10)/100)} className="mt-2 w-full accent-amber-400"/>
          </div>
        </div>
      </Card>
    </section>
  );
}

/* ==========================================================================
   2) ИГРА «ВИТРАЖ СОБОРА» — заполни окно
   Генерим решение (градиентную матрицу), разбираем на плитки, мешаем. Класть
   можно, если по всем уже лежащим соседям |ΔHue| ≤ порога. Финал — когда всё
   поле заполнено. Подсветка доступных клеток.
============================================================================ */
export function StainedGlass() {
  const W = 6, H = 6; const HUE_T = 28; // порог по hue
  const [seed] = useState(() => Math.random()); // чтобы чуть стабилизировать картинку на сессию
  const rand = useCallback((a:number,b:number)=>a+(Math.sin(seed*1e6 + a*97 + b*131)*0.5+0.5)*(b-a),[seed]);

  // Решение
  const solution = useMemo(() => {
    const h0 = rand(0,360);
    const h1 = mod360(h0 + rand(60,140));
    const s0 = rand(0.5,0.85), s1 = rand(0.5,0.85);
    const l0 = rand(0.35,0.55), l1 = rand(0.55,0.75);
    const grid = Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>{
      const tx = x/(W-1), ty=y/(H-1); const t=(tx+ty)/2; // диагональный градиент
      const h = mod360(lerp(h0,h1,t) + rand(-6,6));
      const s = clamp(lerp(s0,s1,t) + rand(-0.05,0.05),0.2,0.95);
      const l = clamp(lerp(l0,l1,t) + rand(-0.04,0.04),0.15,0.9);
      return {h,s,l};
    }));
    return grid;
  }, [W,H,rand]);

  // Мешок плиток
  const bagInit = useMemo(()=>{
    const tiles: {id:string;x:number;y:number;h:number;s:number;l:number}[]=[];
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) tiles.push({id:`${x}-${y}`,x,y,...solution[y][x]});
    for(let i=tiles.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[tiles[i],tiles[j]]=[tiles[j],tiles[i]]}
    return tiles;
  },[solution]);

  const [board, setBoard] = useState<(typeof bagInit[number])[][]>(()=>Array.from({length:H},()=>Array.from({length:W},()=>null as any)));
  const [bag, setBag] = useState(()=>bagInit);
  const [sel, setSel] = useState<string|null>(null);
  const [msg, setMsg] = useState("Заполните окно: класть можно рядом с близкими по оттенку плитками.");

  useEffect(()=>{ setBoard(Array.from({length:H},()=>Array.from({length:W},()=>null as any))); setBag(bagInit); setSel(null); },[bagInit]);

  const neighbors = useCallback((x:number,y:number)=>{
    const acc: any[]=[]; if(y>0) acc.push(board[y-1][x]); if(y<H-1) acc.push(board[y+1][x]); if(x>0) acc.push(board[y][x-1]); if(x<W-1) acc.push(board[y][x+1]);
    return acc.filter(Boolean);
  },[board]);

  const canPlaceAt = useCallback((tile:any,x:number,y:number)=>{
    const nb = neighbors(x,y); if(nb.length===0) return true; // свободный старт
    return nb.every(n => hueDeltaDeg(n.h, tile.h) <= HUE_T);
  },[neighbors]);

  const place = useCallback((x:number,y:number)=>{
    if(!sel) return; const tile = bag.find(t=>t.id===sel)!; if(board[y][x]) return;
    if(!canPlaceAt(tile,x,y)){ setMsg("Слишком другой оттенок для соседей."); return; }
    const nextB = board.map(r=>r.slice()); nextB[y][x]=tile; setBoard(nextB);
    setBag(b=>b.filter(t=>t.id!==sel)); setSel(null);
    setMsg("Красиво! Продолжаем.");
  },[sel,bag,board,canPlaceAt]);

  const done = bag.length===0;

  return (
    <section className="relative">
      <Header title="Витраж собора" subtitle="Заполните окно так, чтобы соседние плитки были близки по оттенку." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-2">
          <div className="text-sm mb-2 text-neutral-300 flex items-center gap-2"><Grid size={16}/> Поле</div>
          <div className="grid" style={{gridTemplateColumns:`repeat(${W},minmax(0,1fr))`, gap: "6px"}}>
            {Array.from({length:H}).map((_,y)=>Array.from({length:W}).map((_,x)=>{
              const t = board[y][x];
              const highlight = sel && canPlaceAt(bag.find(b=>b.id===sel),x,y);
              return (
                <button key={`${x}-${y}`} onClick={()=>place(x,y)} className={`relative aspect-square rounded-md border ${highlight?"border-emerald-300/60":"border-white/10"} shadow-sm`} style={{background: t? hslCss(t.h,t.s,t.l):"#0f172a"}}/>
              );
            }))}
          </div>
          {done && <div className="mt-3 text-emerald-300">Витраж готов! Впечатляюще.</div>}
        </Card>

        <Card>
          <div className="text-sm mb-2 text-neutral-300 flex items-center gap-2"><Sparkles size={16}/> Плитки</div>
          <div className="grid grid-cols-3 gap-3">
            {bag.map(t=> (
              <button key={t.id} onClick={()=>setSel(t.id)} className={`relative aspect-square rounded-md border ${sel===t.id?"border-amber-300/60":"border-white/10"} shadow-sm`} style={{background:hslCss(t.h,t.s,t.l)}} title={`${Math.round(t.h)}°`} />
            ))}
          </div>
          <p className="mt-3 text-sm">{msg}</p>
        </Card>
      </div>
    </section>
  );
}

/* ==========================================================================
   3) ИГРА «СИГНАЛЬНЫЕ МАЯКИ» — путь по узлам
   Узлы соединены, можно идти в соседний, если Hue близок и L возрастает.
   Генерация гарантирует существующий путь.
============================================================================ */
export function SignalBeacons() {
  const N = 5; // 5x5
  const HUE_T = 30; // допуск по оттенку

  const level = useMemo(()=>{
    // генерим монотонный путь от (0,N-1) к (N-1,0)
    const path: Array<[number,number]> = []; let x=0,y=N-1; path.push([x,y]);
    while(x<N-1 || y>0){ const canR=x<N-1, canU=y>0; const goR = canR && (!canU || Math.random()<0.5); if(goR) x++; else y--; path.push([x,y]); }
    // цвета вдоль пути: возрастающая L, близкий Hue
    const h0 = Math.random()*360, hShift = (Math.random()*2-1)*40;
    const s0 = 0.5+Math.random()*0.3;
    const l0 = 0.2, l1 = 0.9;
    const grid = Array.from({length:N},(_,yy)=>Array.from({length:N},(_,xx)=>({h:0,s:0,l:0})));
    path.forEach((p,i)=>{ const t = i/Math.max(1,path.length-1); const hh = mod360(h0 + hShift*t + (Math.random()*8-4)); const ss = clamp(s0 + (Math.random()*0.1-0.05),0.2,0.95); const ll = clamp(lerp(l0,l1,t)+(Math.random()*0.05-0.02),0.05,0.98); const [px,py]=p; grid[py][px] = {h:hh,s:ss,l:ll}; });
    // прочие узлы — шум вокруг ближайшей точки пути
    for(let yy=0;yy<N;yy++) for(let xx=0;xx<N;xx++){ if(grid[yy][xx].l>0) continue; // уже на пути
      // найдём ближайший путь
      let best=1e9, idx=0; for(let i=0;i<path.length;i++){ const d=Math.abs(path[i][0]-xx)+Math.abs(path[i][1]-yy); if(d<best){best=d; idx=i;} }
      const base = grid[path[idx][1]][path[idx][0]]; const hh = mod360(base.h + (Math.random()*24-12)); const ss = clamp(base.s + (Math.random()*0.2-0.1),0.2,0.95); const ll = clamp(base.l + (Math.random()*0.2-0.1),0.05,0.98); grid[yy][xx] = {h:hh,s:ss,l:ll};
    }
    return { grid, start:[0,N-1] as [number,number], goal:[N-1,0] as [number,number], path };
  },[N]);

  const [pos, setPos] = useState<[number,number]>(level.start);
  const [history, setHistory] = useState<[number,number][]>([level.start]);
  const current = level.grid[pos[1]][pos[0]];
  const goal = level.grid[level.goal[1]][level.goal[0]];

  const neigh = useMemo(()=>{
    const acc: Array<[number,number]> = []; const [x,y]=pos;
    if(y>0) acc.push([x,y-1]); if(y<N-1) acc.push([x,y+1]); if(x>0) acc.push([x-1,y]); if(x<N-1) acc.push([x+1,y]);
    return acc as [number,number][];
  },[pos,N]);

  const allowed = neigh.filter(([x,y])=>{
    const to = level.grid[y][x]; const hueOk = hueDeltaDeg(current.h,to.h) <= HUE_T; const lightOk = to.l >= current.l - 0.001; return hueOk && lightOk;});

  const move = (x:number,y:number)=>{
    if(!allowed.some(p=>p[0]===x && p[1]===y)) return; setPos([x,y]); setHistory(h=>[...h,[x,y]]);
  };

  const won = pos[0]===level.goal[0] && pos[1]===level.goal[1];

  return (
    <section className="relative">
      <Header title="Сигнальные маяки" subtitle="Идите по узлам: оттенок должен быть близок, светлота — не убывать." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-2">
          <div className="text-sm text-neutral-300 mb-2 flex items-center gap-2"><ArrowRight size={16}/> Карта</div>
          <div className="grid" style={{gridTemplateColumns:`repeat(${N},minmax(0,1fr))`, gap: "8px"}}>
            {level.grid.map((row,yy)=> row.map((c,xx)=>{
              const here = pos[0]===xx && pos[1]===yy; const goalCell = level.goal[0]===xx && level.goal[1]===yy; const can = allowed.some(p=>p[0]===xx && p[1]===yy);
              return (
                <button key={`${xx}-${yy}`} onClick={()=>move(xx,yy)} className={`relative aspect-square rounded-lg border shadow-md ${can?"border-amber-300/60":"border-white/10"} ${here?"ring-2 ring-white/70":""}`} style={{background: hslCss(c.h,c.s,c.l)}}>
                  {goalCell && <span className="absolute inset-1 rounded-md border-2 border-emerald-400/80"/>}
                </button>
              );
            }))}
          </div>
          {won && <div className="mt-3 text-emerald-300">Связь установлена! Путь найден.</div>}
        </Card>
        <Card>
          <h3 className="font-medium mb-3 flex items-center gap-2"><Info size={18} className="opacity-70"/> Комментарий мастера</h3>
          <p className="text-sm">Держитесь оттенка и постепенно «высветляйтесь». Если клетки рядом серые — ищите другой ход.</p>
          <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
            <InfoBox label="Текущий" value={humanDesc(current.h,current.s,current.l)} />
            <InfoBox label="Цель" value={humanDesc(goal.h,goal.s,goal.l)} />
            <InfoBox label="Δ по hue" value={`${Math.round(hueDeltaDeg(current.h,goal.h))}°`} />
          </div>
        </Card>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------
  ВСПОМОГАТЕЛЬНЫЕ UI-КОМПОНЕНТЫ
---------------------------------------------------------------------------- */
function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-4">
      <h2 className="text-xl md:text-2xl font-semibold tracking-tight flex items-center gap-2">
        {title}
      </h2>
      {subtitle && <p className="text-neutral-300 text-sm md:text-base mt-1">{subtitle}</p>}
    </header>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur ${className}`}>{children}</div>
  );
}

function Swatch({ color, height = "h-40", borderAccent }: { color: {h:number;s:number;l:number}; height?: string; borderAccent?: "emerald" | undefined }) {
  const border = borderAccent === "emerald" ? "border-emerald-400/70" : "border-white/10";
  return (
    <div className={`w-full ${height} rounded-xl border ${border} shadow-inner`} style={{ background: hslCss(color.h,color.s,color.l) }} />
  );
}

function InfoBox({ label, value, highlight, mono = false }: { label: string; value: React.ReactNode; highlight?: boolean; mono?: boolean }) {
  return (
    <div className={`rounded-lg bg-black/30 border ${highlight?"border-emerald-300/50":"border-white/10"} p-3`}>
      <div className="text-neutral-300 text-xs">{label}</div>
      <div className={`${mono?"font-mono":""} font-medium text-sm break-words`}>{value}</div>
    </div>
  );
}

/* --------------------------------------------------------------------------
  ОБЩИЙ КОНТЕЙНЕР ДЛЯ СТРАНИЦЫ — можно не использовать, если вставляете игры
  в свои маршруты. Оставил для быстрого предпросмотра.
---------------------------------------------------------------------------- */
export default function ColorMiniPackPage() {
  const [tab, setTab] = useState<"cipher"|"stained"|"beacons">("cipher");
  return (
    <main className="min-h-dvh relative text-neutral-100">
      {/* Фон-фото мастерской */}
      <div className="absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url('/images/atelier.jpg')" }} />
      <div className="absolute inset-0 -z-10 bg-black/70 backdrop-blur-[2px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-4 flex items-center gap-2">
          <button onClick={()=>setTab("cipher")} className={`px-3 py-2 rounded-xl border ${tab==='cipher'?"border-amber-300/60 bg-white/10":"border-white/10 bg-white/5"}`}>Шифр</button>
          <button onClick={()=>setTab("stained")} className={`px-3 py-2 rounded-xl border ${tab==='stained'?"border-amber-300/60 bg-white/10":"border-white/10 bg-white/5"}`}>Витраж</button>
          <button onClick={()=>setTab("beacons")} className={`px-3 py-2 rounded-xl border ${tab==='beacons'?"border-amber-300/60 bg-white/10":"border-white/10 bg-white/5"}`}>Маяки</button>
        </div>

        {tab==='cipher' && <ColorCipher/>}
        {tab==='stained' && <StainedGlass/>}
        {tab==='beacons' && <SignalBeacons/>}
      </div>
    </main>
  );
}
