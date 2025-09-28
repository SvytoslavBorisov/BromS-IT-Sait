// src/lib/protocol.ts
import { Adj, cloneAdj, parseGraph6, toGraph6 } from "./graph6";
import { Perm, applyPermToAdj, composePerm, invertPerm, randomPerm } from "./perm";
import type { GIInstance, GIInstanceOptions, ProtocolEngine, RoundEvent, ProtocolState, Phase } from "./types";

// Simple deterministic RNG (xorshift32) seeded from string for reproducibility
function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 0x9e3779b9;
}
function makeRNG(seedStr: string): () => number {
  let x = seedFromString(seedStr) || 123456789;
  return () => {
    // xorshift32
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 0x100000000;
  };
}

function randomGraph(n: number, p: number, rng: () => number): Adj {
  const a: Adj = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    a[i][j] = a[j][i] = rng() < p ? 1 : 0;
  }
  return a;
}

export function createInstance(opts: GIInstanceOptions): GIInstance {
  const rng = makeRNG(opts.seed || "seed");
  const n = Math.max(4, Math.min(20, opts.n));
  const rounds = Math.max(1, Math.min(30, opts.rounds));
  const p = Math.max(0.02, Math.min(0.9, opts.density));

  const G1 = randomGraph(n, p, rng);
  // secret isomorphism pi
  const pi: Perm = randomPerm(n, rng);
  const G2 = applyPermToAdj(G1, pi);
  const G1_graph6 = toGraph6(G1);
  const G2_graph6 = toGraph6(G2);

  return {
    n,
    rounds,
    G1,
    G2,
    G1_graph6,
    G2_graph6,
    pi,
  };
}

export function createEngine(inst: GIInstance): ProtocolEngine {
  const rng = makeRNG("challenge-" + Math.random().toString(36).slice(2));
  let round = 0;
  let phase: Phase = "commit";
  let H: Adj | null = null;
  let sigma: Perm | null = null;
  let responsePerm: Perm | null = null;
  let b: 0 | 1 | null = null;
  let lastAccepted: boolean | null = true;
  const stats = { accepted: 0, rejected: 0, completed: 0 };

  function step(): RoundEvent | null {
    if (round >= inst.rounds) return { type: "done", message: "Все раунды завершены." };

    if (phase === "commit") {
      sigma = randomPerm(inst.n, rng);
      H = applyPermToAdj(inst.G1, sigma);
      phase = "challenge";
      return { type: "commit", message: `Раунд ${round+1}: Prover отправляет H = σ(G1).` };
    }

    if (phase === "challenge") {
      b = rng() < 0.5 ? 0 : 1;
      phase = "response";
      return { type: "challenge", message: `Verifier выбирает b = ${b}.` };
    }

    if (phase === "response") {
      if (b == null || !sigma) throw new Error("Invalid state");
      // If b=0 => reveal sigma ; if b=1 => reveal sigma ∘ π^{-1}
      if (b === 0) {
        responsePerm = sigma;
      } else {
        responsePerm = composePerm(sigma, invertPerm(inst.pi));
      }
      phase = "verify";
      return { type: "response", message: `Prover раскрывает перестановку (${b===0 ? "σ" : "σ∘π⁻¹"}).` };
    }

    if (phase === "verify") {
      if (!H || !responsePerm) throw new Error("Invalid state");
      const target = b === 0 ? inst.G1 : inst.G2;
      const lhs = applyPermToAdj(target, responsePerm);
      const ok = equalAdj(lhs, H);
      lastAccepted = ok; // сохраняем
      if (ok) {
        stats.accepted++;
      } else {
        stats.rejected++;
      }
      stats.completed++;
      const msg = ok ? `✅ Проверка пройдена.` : `⛔ Проверка провалена.`;
      // prepare next round
      round++;
      phase = "commit";
      H = null; sigma = null; responsePerm = null; b = null;
      return { type: "verify", message: `Проверка: ${msg}` };
    }

    return null;
  }

  function equalAdj(a: Adj, b: Adj): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) for (let j = 0; j < a.length; j++) {
      if (a[i][j] !== b[i][j]) return false;
    }
    return true;
  }

  return {
    next: step,
    getState: () => ({
      phase,
      round,
      H,
      sigma,
      responsePerm,
      b,
      accepted: lastAccepted,
      stats,
    }),
  };
}
