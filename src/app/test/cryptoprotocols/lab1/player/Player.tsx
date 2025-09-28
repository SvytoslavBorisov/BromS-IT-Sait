// src/app/zk-gi/player/Player.tsx
"use client";

import { useMemo, useState, useCallback } from "react";
import { GraphPanels } from "./parts/GraphPanels";
import { Controls } from "./parts/Controls";
import { Panels } from "./parts/Panels";
import { useTicker } from "./parts/useTicker";
import type { GIInstance, GIInstanceOptions, ProtocolEngine, RoundEvent } from "../types";

export function ProtocolPlayer({ opts }: { opts: GIInstanceOptions }) {
  const [engine, setEngine] = useState<ProtocolEngine | null>(null);
  const [instance, setInstance] = useState<GIInstance | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [autoplay, setAutoplay] = useState<boolean>(false);

  const regenerate = useCallback(() => {
    const { createInstance, createEngine } = require("../protocol");
    const inst = createInstance(opts);
    const eng = createEngine(inst);
    setInstance(inst);
    setEngine(eng);
    setLog([
      `Создан инстанс: n=${inst.n}, rounds=${inst.rounds}, density=${opts.density.toFixed(2)}, seed="${opts.seed}"`,
      `G₁ (graph6): ${inst.G1_graph6}`,
      `G₂ (graph6): ${inst.G2_graph6}`,
      `π (секрет у Prover): [${inst.pi.join(", ")}]`,
    ]);
  }, [opts]);

  const step = useCallback(() => {
    if (!engine) return;
    const ev: RoundEvent | null = engine.next();
    if (ev) setLog((p) => [...p, ev.message]);
  }, [engine]);

  const resetRound = useCallback(() => {
    if (!engine || !instance) return;
    const { createEngine } = require("../protocol");
    const fresh = createEngine(instance);
    setEngine(fresh);
    setLog((p) => [...p, "— Сброс состояний раундов —"]);
  }, [engine, instance]);

  // автоплей
  useTicker(autoplay || (!!opts.autoplay && !!engine), 1000, step);

  useMemo(() => {
    regenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.n, opts.rounds, opts.density, opts.seed]);

  if (!engine || !instance) return null;

  return (
    <section className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
      <Controls
        instance={instance}
        engine={engine}
        autoplay={autoplay}
        onStep={step}
        onToggleAuto={() => setAutoplay((a) => !a)}
        onResetRound={resetRound}
        onNewInstance={regenerate}
      />

      <GraphPanels instance={instance} engine={engine} />

      <Panels engine={engine} log={log} />
    </section>
  );
}
