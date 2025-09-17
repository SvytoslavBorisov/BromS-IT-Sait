// src/components/ProtocolPlayer.tsx
"use client";

import { motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import { GraphView } from "./GraphView";
import { parseGraph6, toGraph6, adjToEdges } from "./graph6";
import { applyPermToAdj, composePerm, invertPerm, randomPerm } from "./perm";
import type { GIInstance, GIInstanceOptions, ProtocolEngine, RoundEvent } from "./types";

export interface ProtocolPlayerProps {
  opts: GIInstanceOptions;
}

function useTicker(active: boolean, intervalMs: number, onTick: () => void) {
  const t = useRef<number | null>(null);
  const saved = useRef(onTick);
  saved.current = onTick;

  const clear = () => {
    if (t.current != null) {
      window.clearInterval(t.current);
      t.current = null;
    }
  };

  const start = () => {
    clear();
    t.current = window.setInterval(() => saved.current(), intervalMs);
  };

  if (active && t.current == null) start();
  if (!active && t.current != null) clear();
}

export function ProtocolPlayer({ opts }: ProtocolPlayerProps) {
  const [engine, setEngine] = useState<ProtocolEngine | null>(null);
  const [instance, setInstance] = useState<GIInstance | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [autoplay, setAutoplay] = useState<boolean>(false);

  // Prepare or re-generate instance
  const regenerate = useCallback(() => {
    const { createInstance, createEngine } = require("@/lib/protocol");
    const inst = createInstance(opts);
    const eng = createEngine(inst);
    setInstance(inst);
    setEngine(eng);
    setLog([
      `Создан инстанс: n=${inst.n}, rounds=${inst.rounds}, density=${opts.density.toFixed(2)}, seed="${opts.seed}"`,
      `G1 (graph6): ${inst.G1_graph6}`,
      `G2 (graph6): ${inst.G2_graph6}`,
      `π (секрет у Prover): [${inst.pi.join(", ")}]`,
    ]);
  }, [opts]);

  const step = useCallback(() => {
    if (!engine) return;
    const ev: RoundEvent | null = engine.next();
    if (!ev) return;
    setLog((prev) => [...prev, ev.message]);
  }, [engine]);

  const reset = useCallback(() => {
    if (!engine || !instance) return;
    const { createEngine } = require("@/lib/protocol");
    const fresh = createEngine(instance);
    setEngine(fresh);
    setLog((prev) => [...prev, "— Сброс состояний раундов —"]);
  }, [engine, instance]);

  // Autoplay ticker
  useTicker(autoplay || (!!opts.autoplay && !!engine), 900, step);

  // instantiate once on mount / when opts change
  useMemo(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.n, opts.rounds, opts.density, opts.seed]);

  if (!engine || !instance) return null;

  const { n, G1, G2 } = instance;
  const { phase, round, H, b, accepted, sigma, responsePerm, stats } = engine.getState();

  const badge =
    phase === "commit" ? "Commit →" :
    phase === "challenge" ? "Challenge →" :
    phase === "response" ? "Response →" :
    phase === "verify" ? "Verify" : "";

  // Edges for visualization
  const eG1 = adjToEdges(G1);
  const eG2 = adjToEdges(G2);
  const eH = H ? adjToEdges(H) : [];

  return (
    <section className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
            onClick={step}
          >
            Шаг
          </button>
          <button
            className={`px-3 py-1.5 rounded text-sm ${autoplay ? "bg-rose-600 hover:bg-rose-500" : "bg-slate-700 hover:bg-slate-600"} text-white`}
            onClick={() => setAutoplay((a) => !a)}
          >
            {autoplay ? "Стоп" : "Авто"}
          </button>
          <button
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm"
            onClick={reset}
          >
            Сброс раунда
          </button>
          <button
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-sm"
            onClick={regenerate}
          >
            Новый инстанс
          </button>
        </div>

        <div className="text-sm text-slate-300">
          Раунд <span className="tabular-nums">{round + 1}</span> / {instance.rounds} •
          <span className="ml-2">{badge}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Prover / G1 */}
        <div>
          <GraphView title="Prover — G₁" n={n} edges={eG1} />
          <div className="mt-2 text-xs text-slate-400">
            <div>G₁ (graph6): <code className="break-all">{instance.G1_graph6}</code></div>
          </div>
        </div>

        {/* Middle — H and envelopes */}
        <div className="relative">
          <GraphView title="Commit — H = σ(G₁)" n={n} edges={eH} showBadge={badge} />
          {/* envelope animations */}
          <div className="pointer-events-none absolute inset-0">
            {phase === "commit" && (
              <motion.div
                className="absolute top-6 left-3 px-2 py-1 rounded bg-emerald-500/90 text-black text-xs font-semibold"
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: 160, opacity: 1 }}
                transition={{ duration: 1.1 }}
              >
                ✉️ H отправлен
              </motion.div>
            )}
            {phase === "challenge" && (
              <motion.div
                className="absolute top-10 right-3 px-2 py-1 rounded bg-indigo-400/90 text-black text-xs font-semibold"
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: -160, opacity: 1 }}
                transition={{ duration: 1.1 }}
              >
                ❓ b = {b}
              </motion.div>
            )}
            {phase === "response" && (
              <motion.div
                className="absolute bottom-6 left-3 px-2 py-1 rounded bg-amber-400/90 text-black text-xs font-semibold"
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: 160, opacity: 1 }}
                transition={{ duration: 1.1 }}
              >
                🔑 ответ: permutation
              </motion.div>
            )}
            {phase === "verify" && (
              <motion.div
                className={`absolute bottom-10 right-3 px-2 py-1 rounded text-black text-xs font-semibold ${accepted ? "bg-emerald-400/90" : "bg-rose-400/90"}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                {accepted ? "✅ Проверка пройдена" : "⛔ Ошибка"}
              </motion.div>
            )}
          </div>
        </div>

        {/* Verifier / G2 */}
        <div>
          <GraphView title="Verifier — G₂" n={n} edges={eG2} />
          <div className="mt-2 text-xs text-slate-400">
            <div>G₂ (graph6): <code className="break-all">{instance.G2_graph6}</code></div>
          </div>
        </div>
      </div>

      {/* state details */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <div className="font-semibold mb-1">Внутреннее состояние</div>
          <div>phase: <code>{engine.getState().phase}</code></div>
          <div>σ: <code className="break-all">{sigma ? `[${sigma.join(", ")}]` : "—"}</code></div>
          <div>Ответная перестановка: <code className="break-all">{responsePerm ? `[${responsePerm.join(", ")}]` : "—"}</code></div>
          <div>b: <code>{b ?? "—"}</code></div>
        </div>

        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <div className="font-semibold mb-1">Статистика</div>
          <div>accepted: <span className="tabular-nums">{stats.accepted}</span></div>
          <div>rejected: <span className="tabular-nums">{stats.rejected}</span></div>
          <div>пройдено раундов: <span className="tabular-nums">{stats.completed}</span></div>
        </div>

        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <div className="font-semibold mb-1">Лог</div>
          <div className="max-h-40 overflow-auto space-y-1">
            {log.map((l, i) => (
              <div key={i} className="text-slate-400">{l}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
