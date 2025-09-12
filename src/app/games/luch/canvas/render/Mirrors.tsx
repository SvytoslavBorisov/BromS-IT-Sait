"use client";

import React, { useMemo } from "react";
import { SegmentObj, MirrorSpec } from "../../engine/types";

export function Mirrors({
  compact, mainMirrorPx, mainMirror, extraMirrorsPx, onPick,
}: {
  compact: boolean;
  mainMirrorPx: SegmentObj;
  mainMirror: MirrorSpec;
  extraMirrorsPx: SegmentObj[];
  onPick: (id: string, e: React.PointerEvent<SVGGElement>) => void;
}) {
  // Центр главного зеркала
  const cx = (mainMirrorPx.A.x + mainMirrorPx.B.x) / 2;
  const cy = (mainMirrorPx.A.y + mainMirrorPx.B.y) / 2;

  // Вектор вдоль зеркала и нормаль (для декоративных меток)
  const vx = mainMirrorPx.B.x - mainMirrorPx.A.x;
  const vy = mainMirrorPx.B.y - mainMirrorPx.A.y;
  const vlen = Math.hypot(vx, vy) || 1;
  const ux = vx / vlen;              // единичный вдоль
  const uy = vy / vlen;
  const nx = -uy;                    // нормаль
  const ny = ux;

  // Уникальные id фильтров/градиентов (чтобы не конфликтовали между инстансами)
  const ids = useMemo(() => {
    const base = `m-${mainMirror.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    return {
      gradMain: `${base}-grad-main`,
      gradBevel: `${base}-grad-bevel`,
      gradShine: `${base}-grad-shine`,
      filtGlow: `${base}-f-glow`,
      filtSoft: `${base}-f-soft`,
      filtEdge: `${base}-f-edge`,
      pathMain: `${base}-path-main`,
    };
  }, [mainMirror.id]);

  // Толщины
  const W = compact ? 7 : 8;        // основная толщина штриха зеркала
  const Wb = Math.max(1, W - 2);    // фаска (внутренняя)
  const capR = compact ? 12 : 13;   // радиус центрального «джема»
  const endR = Math.max(5, Math.round(W * 0.9)); // размер торцевых «алмазов»

  // Координаты торцов и «блика»
  const { A, B } = mainMirrorPx;
  // Небольшой сдвиг для блестящей полосы (чуть в сторону нормали)
  const shineOffset = Math.max(1.25, W * 0.18);
  const shineA = { x: A.x + nx * shineOffset, y: A.y + ny * shineOffset };
  const shineB = { x: B.x + nx * shineOffset, y: B.y + ny * shineOffset };

  return (
    <>
      {/* ===== defs: градиенты и фильтры только для этого компонента ===== */}
      <defs>
        {/* Основной «стеклянный» градиент */}
        <linearGradient id={ids.gradMain} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#7cd6ff" stopOpacity="0.85" />
          <stop offset="50%"  stopColor="#b6e7ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#7cd6ff" stopOpacity="0.85" />
        </linearGradient>

        {/* Фаски по краям — лёгкая холодная засветка */}
        <linearGradient id={ids.gradBevel} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#eaf6ff" stopOpacity="0.55" />
          <stop offset="60%"  stopColor="#ffffff" stopOpacity="0.00" />
          <stop offset="100%" stopColor="#9ddaff" stopOpacity="0.35" />
        </linearGradient>

        {/* Узкая бликующая полоска со «скользящим» светом */}
        <linearGradient id={ids.gradShine} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.00)" />
          <stop offset="45%"  stopColor="rgba(255,255,255,0.55)" />
          <stop offset="55%"  stopColor="rgba(255,255,255,0.90)" />
          <stop offset="65%"  stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
        </linearGradient>

        {/* Мягкое свечение вокруг зеркала */}
        <filter id={ids.filtGlow} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="6" result="b1" />
          <feGaussianBlur stdDeviation="10" result="b2" />
          <feMerge>
            <feMergeNode in="b2" />
            <feMergeNode in="b1" />
          </feMerge>
        </filter>

        {/* Лёгкая подсветка для «джема» и торцов */}
        <filter id={ids.filtSoft} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>

        {/* Подсветка кромки (тонкая) */}
        <filter id={ids.filtEdge} x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* ===== ГЛАВНОЕ ЗЕРКАЛО ===== */}
      <g onPointerDown={(e) => onPick(mainMirror.id, e)} style={{ cursor: "grab" }}>
        {/* 1) Подложка свечения (широкий мягкий след) */}
        <line
          x1={A.x} y1={A.y} x2={B.x} y2={B.y}
          stroke="#7cd6ff" strokeOpacity={0.25}
          strokeWidth={W * 1.8} strokeLinecap="round"
          filter={`url(#${ids.filtGlow})`}
        />

        {/* 2) Основной «стеклянный» штрих */}
        <line
          x1={A.x} y1={A.y} x2={B.x} y2={B.y}
          stroke={`url(#${ids.gradMain})`}
          strokeWidth={W} strokeLinecap="round"
        />

        {/* 3) Внутренняя фаска (тоньше) */}
        <line
          x1={A.x} y1={A.y} x2={B.x} y2={B.y}
          stroke={`url(#${ids.gradBevel})`}
          strokeWidth={Wb} strokeLinecap="round" opacity={0.85}
        />

        {/* 4) Блик-полоса, немного «съехавшая» в сторону нормали */}
        <line
          x1={shineA.x} y1={shineA.y} x2={shineB.x} y2={shineB.y}
          stroke={`url(#${ids.gradShine})`}
          strokeWidth={Math.max(1.5, W * 0.22)}
          strokeLinecap="round" opacity={0.9}
          filter={`url(#${ids.filtEdge})`}
          // Анимация «скользящего» блика вдоль зеркала (SMIL, нативно в SVG)
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;120;0"
            dur="3.2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dasharray"
            values="0,999;28,999;0,999"
            dur="3.2s"
            repeatCount="indefinite"
          />
        </line>

        {/* 5) Торцы — «алмазы» с мягким свечением */}
        <g filter={`url(#${ids.filtSoft})`} opacity={0.95}>
          <polygon
            points={`
              ${A.x + nx * endR},${A.y + ny * endR}
              ${A.x - ux * endR},${A.y - uy * endR}
              ${A.x - nx * endR},${A.y - ny * endR}
              ${A.x + ux * endR},${A.y + uy * endR}
            `}
            fill="#aee6ff"
            opacity={0.9}
          />
          <polygon
            points={`
              ${B.x + nx * endR},${B.y + ny * endR}
              ${B.x + ux * endR},${B.y + uy * endR}
              ${B.x - nx * endR},${B.y - ny * endR}
              ${B.x - ux * endR},${B.y - uy * endR}
            `}
            fill="#aee6ff"
            opacity={0.9}
          />
        </g>

        {/* 6) Небольшие маркеры нормали по центру (подсказка вращения) */}
        <g opacity={0.55}>
          <line
            x1={cx - nx * 10} y1={cy - ny * 10}
            x2={cx + nx * 10} y2={cy + ny * 10}
            stroke="#e8f6ff" strokeWidth={1.5}
            strokeLinecap="round"
          />
          <line
            x1={cx - nx * 16} y1={cy - ny * 16}
            x2={cx - nx * 10} y2={cy - ny * 10}
            stroke="#e8f6ff" strokeWidth={1.5}
            strokeLinecap="round"
          />
          <line
            x1={cx + nx * 10} y1={cy + ny * 10}
            x2={cx + nx * 16} y2={cy + ny * 16}
            stroke="#e8f6ff" strokeWidth={1.5}
            strokeLinecap="round"
          />
        </g>

        {/* 7) Центральный «драг-джем» (кнопка-маркер центра) */}
        <g>
          <circle cx={cx} cy={cy} r={capR} fill="#8ad2ff" opacity={0.95}/>
          <circle cx={cx} cy={cy} r={capR * 0.55} fill="#ffffff" opacity={0.35}/>
          <circle cx={cx} cy={cy} r={capR * 0.85} fill="none" stroke="#d9f2ff" strokeOpacity={0.7} />
        </g>
      </g>

      {/* ===== ДОПОЛНИТЕЛЬНЫЕ ЗЕРКАЛА (чуть проще, но в том же стиле) ===== */}
      {extraMirrorsPx.map((m) => {
        const ex = (m.A.x + m.B.x) / 2;
        const ey = (m.A.y + m.B.y) / 2;
        const evx = m.B.x - m.A.x;
        const evy = m.B.y - m.A.y;
        const evlen = Math.hypot(evx, evy) || 1;
        const eux = evx / evlen;
        const euy = evy / evlen;
        const enx = -euy;
        const eny = eux;
        const eShineOffset = Math.max(1.0, W * 0.16);
        const sA = { x: m.A.x + enx * eShineOffset, y: m.A.y + eny * eShineOffset };
        const sB = { x: m.B.x + enx * eShineOffset, y: m.B.y + eny * eShineOffset };

        return (
          <g key={m.id} onPointerDown={(e) => onPick(m.id, e)} style={{ cursor: "grab" }}>
            <line
              x1={m.A.x} y1={m.A.y} x2={m.B.x} y2={m.B.y}
              stroke="#7ccaff" strokeOpacity={0.22}
              strokeWidth={(compact ? 6 : 7) * 1.6} strokeLinecap="round"
              filter={`url(#${ids.filtGlow})`}
            />
            <line
              x1={m.A.x} y1={m.A.y} x2={m.B.x} y2={m.B.y}
              stroke="url(#m-grad-extra-main)"
              strokeWidth={compact ? 6 : 7} strokeLinecap="round"
            />
            <line
              x1={m.A.x} y1={m.A.y} x2={m.B.x} y2={m.B.y}
              stroke="url(#m-grad-extra-bevel)"
              strokeWidth={Math.max(1, (compact ? 6 : 7) - 2)}
              strokeLinecap="round" opacity={0.85}
            />
            <line
              x1={sA.x} y1={sA.y} x2={sB.x} y2={sB.y}
              stroke="url(#m-grad-extra-shine)"
              strokeWidth={Math.max(1.25, (compact ? 6 : 7) * 0.2)}
              strokeLinecap="round" opacity={0.85}
            >
              <animate
                attributeName="stroke-dashoffset"
                values="0;110;0"
                dur="3.6s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-dasharray"
                values="0,999;24,999;0,999"
                dur="3.6s"
                repeatCount="indefinite"
              />
            </line>
            {/* маленькая точка-маркер центра */}
            <circle cx={ex} cy={ey} r={compact ? 5 : 6} fill="#bfe8ff" opacity={0.85} />
          </g>
        );
      })}

      {/* ===== Глобальные (для доп. зеркал) градиенты — одноразовые id ===== */}
      <defs>
        <linearGradient id="m-grad-extra-main" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#6cc8ff" stopOpacity="0.85" />
          <stop offset="50%"  stopColor="#a9defa" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#6cc8ff" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="m-grad-extra-bevel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#eaf6ff" stopOpacity="0.5" />
          <stop offset="60%"  stopColor="#ffffff" stopOpacity="0.00" />
          <stop offset="100%" stopColor="#9ddaff" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="m-grad-extra-shine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.00)" />
          <stop offset="50%"  stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
        </linearGradient>
      </defs>
    </>
  );
}
