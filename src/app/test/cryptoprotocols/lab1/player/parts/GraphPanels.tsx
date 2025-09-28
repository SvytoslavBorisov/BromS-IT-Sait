// src/app/zk-gi/player/parts/GraphPanels.tsx
"use client";

import { motion } from "framer-motion";
import { GraphView } from "../../GraphView";
import { adjToEdges } from "../../graph6";
import type { GIInstance, ProtocolEngine } from "../../types";

export function GraphPanels({ instance, engine }: { instance: GIInstance; engine: ProtocolEngine }) {
  const { n, G1, G2 } = instance;
  const { phase, H, b, accepted } = engine.getState();

  const eG1 = adjToEdges(G1);
  const eG2 = adjToEdges(G2);
  const eH = H ? adjToEdges(H) : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Prover / G1 */}
      <Card>
        <CardTitle>Prover — G₁</CardTitle>
        <GraphView title="" n={n} edges={eG1} />
        <UnderText label="G₁ (graph6)" value={instance.G1_graph6} />
      </Card>

      {/* H with messages */}
      <Card>
        <CardTitle>Commit — H = σ(G₁)</CardTitle>
        <div className="relative">
          <GraphView title="" n={n} edges={eH} />
          <div className="pointer-events-none absolute inset-0">
            {phase === "commit" && (
              <motion.div
                className="absolute top-3 left-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs shadow"
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: 120, opacity: 1 }}
                transition={{ duration: 1 }}
              >✉️ H отправлен</motion.div>
            )}
            {phase === "challenge" && (
              <motion.div
                className="absolute top-10 right-3 px-2 py-1 rounded-md bg-gray-700/90 text-white text-xs shadow"
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: -120, opacity: 1 }}
                transition={{ duration: 1 }}
              >❓ b = {b}</motion.div>
            )}
            {phase === "response" && (
              <motion.div
                className="absolute bottom-6 left-3 px-2 py-1 rounded-md bg-gray-800 text-white text-xs shadow"
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: 120, opacity: 1 }}
                transition={{ duration: 1 }}
              >🔑 ответ: permutation</motion.div>
            )}
            {phase === "verify" && (
              <motion.div
                className={`absolute bottom-10 right-3 px-2 py-1 rounded-md text-xs shadow ${accepted ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {accepted ? "✅ Проверка пройдена" : "⛔ Ошибка"}
              </motion.div>
            )}
          </div>
        </div>
      </Card>

      {/* Verifier / G2 */}
      <Card>
        <CardTitle>Verifier — G₂</CardTitle>
        <GraphView title="" n={n} edges={eG2} />
        <UnderText label="G₂ (graph6)" value={instance.G2_graph6} />
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-3">{children}</div>;
}
function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold text-gray-800">{children}</h3>;
}
function UnderText({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 text-xs text-gray-600">
      {label}: <code className="break-all">{value}</code>
    </div>
  );
}
