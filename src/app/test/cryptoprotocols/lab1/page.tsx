// src/app/zk-gi/page.tsx
"use client";

/**
 * Demo: Zero-Knowledge Protocol based on Graph Isomorphism (multi-round)
 * Next.js App Router page with beautiful animations and full graph6 support.
 *
 * Requirements:
 *   npm i framer-motion
 *   (Tailwind is optional but recommended; styles here are simple and degrade gracefully)
 *
 * Drop this file into your Next.js project and open /zk-gi.
 */

import { useMemo, useState } from "react";
import { ProtocolPlayer } from "./ProtocolPlayer";
import type { GIInstanceOptions } from "./types";

export default function Page() {
  const [opts, setOpts] = useState<GIInstanceOptions>({
    n: 8,
    rounds: 6,
    density: 0.35,
    seed: "demo-seed",
    autoplay: false,
  });

  return (
    <main className="min-h-screen w-full p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Zero‑Knowledge: Graph Isomorphism (многораундовый)
          </h1>
          <p className="text-slate-300 mt-2">
            Демонстрация протокола: Prover доказывает знание изоморфизма между
            графами <span className="font-mono">G₁</span> и{" "}
            <span className="font-mono">G₂</span> без раскрытия секрета.
          </p>
          <p className="text-emerald-300 mt-1">
            Формат графов — <span className="font-mono">graph6</span> — да.
          </p>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
            <h2 className="font-semibold mb-3">Параметры инстанса</h2>
            <form
              className="grid grid-cols-2 gap-3 text-sm"
              onSubmit={(e) => e.preventDefault()}
            >
              <label className="flex items-center gap-2">
                <span>N вершин</span>
                <input
                  type="number"
                  min={4}
                  max={20}
                  value={opts.n}
                  onChange={(e) =>
                    setOpts((o) => ({ ...o, n: parseInt(e.target.value || "8") }))
                  }
                  className="w-20 rounded bg-slate-800 border border-slate-700 px-2 py-1"
                />
              </label>

              <label className="flex items-center gap-2">
                <span>Раундов</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={opts.rounds}
                  onChange={(e) =>
                    setOpts((o) => ({ ...o, rounds: parseInt(e.target.value || "6") }))
                  }
                  className="w-20 rounded bg-slate-800 border border-slate-700 px-2 py-1"
                />
              </label>

              <label className="col-span-2 flex items-center gap-2">
                <span>Плотность рёбер</span>
                <input
                  type="range"
                  min={0.05}
                  max={0.8}
                  step={0.05}
                  value={opts.density}
                  onChange={(e) =>
                    setOpts((o) => ({ ...o, density: parseFloat(e.target.value) }))
                  }
                  className="w-full"
                />
                <span className="tabular-nums w-16 text-right">
                  {opts.density.toFixed(2)}
                </span>
              </label>

              <label className="col-span-2 flex items-center gap-2">
                <span>Seed</span>
                <input
                  value={opts.seed || ""}
                  onChange={(e) => setOpts((o) => ({ ...o, seed: e.target.value }))}
                  className="flex-1 rounded bg-slate-800 border border-slate-700 px-2 py-1"
                />
              </label>

              <label className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={opts.autoplay}
                  onChange={(e) => setOpts((o) => ({ ...o, autoplay: e.target.checked }))}
                />
                <span>Автовоспроизведение</span>
              </label>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
            <h2 className="font-semibold mb-3">Кратко о шагах</h2>
            <ol className="list-decimal ml-5 space-y-2 text-sm text-slate-300">
              <li><b>Commit.</b> Prover выбирает случайную перестановку σ и отправляет граф <i>H = σ(G₁)</i>.</li>
              <li><b>Challenge.</b> Verifier выбирает случайный бит b ∈ {`{0,1}` }.</li>
              <li><b>Response.</b> Если b=0 — раскрыть σ (изо H≅G₁); если b=1 — раскрыть σ∘π⁻¹ (изо H≅G₂).</li>
              <li><b>Verify.</b> Проверяющий убеждается, что раскрытая перестановка действительно изоморфизм.</li>
            </ol>
            <p className="text-emerald-300 mt-1">
              {"Вероятность обмана в одном раунде — 1/2; после k раундов — 2^{-k}."}
            </p>
          </div>
        </section>

        <ProtocolPlayer opts={opts} />
      </div>
    </main>
  );
}
