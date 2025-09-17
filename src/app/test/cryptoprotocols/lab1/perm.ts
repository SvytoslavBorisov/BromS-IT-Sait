// src/lib/perm.ts
import type { Adj } from "./graph6";

export type Perm = number[]; // image of 0..n-1

export function identityPerm(n: number): Perm {
  return Array.from({ length: n }, (_, i) => i);
}

export function invertPerm(p: Perm): Perm {
  const n = p.length;
  const inv = new Array(n).fill(0);
  for (let i = 0; i < n; i++) inv[p[i]] = i;
  return inv;
}

export function composePerm(a: Perm, b: Perm): Perm {
  // (a ∘ b)(i) = a[b[i]]
  const n = a.length;
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) out[i] = a[b[i]];
  return out;
}

export function applyPermToAdj(adj: Adj, p: Perm): Adj {
  const n = adj.length;
  const out: Adj = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      out[p[i]][p[j]] = adj[i][j];
    }
  }
  return out;
}

export function randomPerm(n: number, rng: () => number): Perm {
  const arr = identityPerm(n);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
