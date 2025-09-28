// src/app/zk-gi/page.tsx
"use client";

/**
 * Zero-Knowledge: Graph Isomorphism (multi-round)
 * Чистый, спокойный UI без «неона». Карточки, светлый фон, понятные подписи.
 *
 * Требуется:
 *   npm i framer-motion
 */

import { useState } from "react";
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
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Zero-Knowledge: Graph Isomorphism (многораундовый)
          </h1>
          <p className="mt-2 text-gray-600">
            Демонстрация протокола: Prover доказывает знание изоморфизма между графами{" "}
            <span className="font-mono">G₁</span> и <span className="font-mono">G₂</span> без раскрытия секрета.
          </p>
          <p className="mt-1 text-gray-700">
            Формат графов — <code className="font-mono">graph6</code>.
          </p>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Карточка: Параметры */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold">Параметры</h2>
              <p className="text-sm text-gray-500">Задайте размер и «сложность» эксперимента</p>
            </div>

            <form className="p-4 grid grid-cols-2 gap-4 text-sm" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-gray-700 font-medium">N вершин</label>
                <input
                  type="number"
                  min={4}
                  max={20}
                  value={opts.n}
                  onChange={(e) => setOpts((o) => ({ ...o, n: parseInt(e.target.value || "8") }))}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-800"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium">Раундов</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={opts.rounds}
                  onChange={(e) => setOpts((o) => ({ ...o, rounds: parseInt(e.target.value || "6") }))}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-800"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-gray-700 font-medium">Плотность рёбер</label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="range"
                    min={0.05}
                    max={0.8}
                    step={0.05}
                    value={opts.density}
                    onChange={(e) => setOpts((o) => ({ ...o, density: parseFloat(e.target.value) }))}
                    className="flex-1 accent-gray-800"
                  />
                  <span className="tabular-nums w-14 text-right text-gray-700">{opts.density.toFixed(2)}</span>
                </div>
              </div>

              <details className="col-span-2 rounded-lg bg-gray-50 border border-gray-200 p-3 open:bg-gray-50">
                <summary className="cursor-pointer text-gray-700 font-medium select-none">
                  Расширенные настройки
                </summary>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-gray-700 font-medium">Seed (для воспроизводимости)</label>
                    <input
                      value={opts.seed || ""}
                      onChange={(e) => setOpts((o) => ({ ...o, seed: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-800"
                    />
                  </div>

                  <label className="col-span-2 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={opts.autoplay}
                      onChange={(e) => setOpts((o) => ({ ...o, autoplay: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span className="text-gray-700">Автовоспроизведение шагов</span>
                  </label>
                </div>
              </details>
            </form>
          </div>

          {/* Карточка: Кратко о шагах */}
          <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-base font-semibold">Как работает протокол</h2>
            </div>
            <div className="p-4">
              <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700">
                <li>
                  <b>Commit.</b> Prover выбирает случайную перестановку σ и отправляет граф <i>H = σ(G₁)</i>.
                </li>
                <li>
                  <b>Challenge.</b> Verifier выбирает случайный бит b ∈ {"{0,1}"}.
                </li>
                <li>
                  <b>Response.</b> Если b=0 — раскрыть σ (изо H≅G₁); если b=1 — раскрыть σ∘π⁻¹ (изо H≅G₂).
                </li>
                <li>
                  <b>Verify.</b> Проверяющий убеждается, что раскрытая перестановка действительно изоморфизм.
                </li>
              </ol>
              <p className="mt-3 text-sm text-gray-700">
                {"Вероятность обмана в одном раунде — 1/2; после k раундов — 2^{-k}."}
              </p>
            </div>
          </div>
        </section>

        {/* Основной плеер протокола (кнопки/графы/лог) */}
        <ProtocolPlayer opts={opts} />

        <footer className="mt-8 text-xs text-gray-500">
          Подсказка: одинаковый <i>seed</i> даёт одинаковые графы и π — удобно для отчёта.
        </footer>
      </div>
    </main>
  );
}
