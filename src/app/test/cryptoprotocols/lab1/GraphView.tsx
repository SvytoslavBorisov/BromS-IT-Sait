// src/components/GraphView.tsx
"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

type Pos = { x: number; y: number };
type Edge = [number, number];

export interface GraphViewProps {
  title: string;
  n: number;
  edges: Edge[];
  highlightedNodes?: Set<number>;
  highlightedEdges?: Set<string>; // key "i-j"
  className?: string;
  showBadge?: string;
}

/** Deterministic circular layout for stable animations */
function circleLayout(n: number, w: number, h: number): Pos[] {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.36 + 16;
  const out: Pos[] = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return out;
}

export function GraphView(props: GraphViewProps) {
  const { title, n, edges, highlightedNodes, highlightedEdges, className, showBadge } = props;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 560, h: 360 });

  useEffect(() => {
    function update() {
      if (!wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      setSize({ w: rect.width, h: Math.max(300, Math.min(420, rect.width * 0.64)) });
    }
    update();
    const ro = new ResizeObserver(update);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const positions = useMemo(() => circleLayout(n, size.w, size.h), [n, size.w, size.h]);

  const edgeKey = (i: number, j: number) => (i < j ? `${i}-${j}` : `${j}-${i}`);

  return (
    <div
      ref={wrapRef}
      className={`relative rounded-2xl border border-slate-800/60 bg-slate-900/40 p-3 ${className || ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        {showBadge && (
          <span className="text-xxs text-emerald-300/90 bg-emerald-300/10 border border-emerald-400/30 px-2 py-0.5 rounded-full">
            {showBadge}
          </span>
        )}
      </div>
      <svg width="100%" height={size.h}>
        {/* edges */}
        {edges.map(([i, j], idx) => {
          const key = edgeKey(i, j);
          const hi = highlightedEdges?.has(key);
          return (
            <motion.line
              key={idx}
              x1={positions[i].x}
              y1={positions[i].y}
              x2={positions[j].x}
              y2={positions[j].y}
              stroke={hi ? "rgb(16 185 129)" : "rgb(71 85 105)"}
              strokeWidth={hi ? 2.4 : 1.2}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />
          );
        })}

        {/* nodes */}
        {positions.map((p, i) => {
          const hi = highlightedNodes?.has(i);
          return (
            <g key={i}>
              <motion.circle
                cx={p.x}
                cy={p.y}
                r={hi ? 11 : 9}
                fill={hi ? "rgb(16 185 129)" : "rgb(148 163 184)"}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.01 * i }}
              />
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                className="fill-black font-semibold text-[10px] select-none"
              >
                {i}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
