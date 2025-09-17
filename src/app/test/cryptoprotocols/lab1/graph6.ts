// src/lib/graph6.ts
/**
 * Minimal graph6 parser/serializer for n <= 62.
 * Undirected simple graphs, bit order: lex pairs (i<j).
 */

export type Adj = number[][];
export type Edge = [number, number];

function six2int(c: string): number {
  return c.charCodeAt(0) - 63;
}
function int2six(v: number): string {
  return String.fromCharCode(v + 63);
}

export function parseGraph6(s: string): { n: number; adj: Adj } {
  if (!s || s.length === 0) throw new Error("graph6: empty");
  const first = six2int(s[0]);
  if (first >= 63 || first < 0) throw new Error("graph6: invalid first char");
  // only small graph6 (n <= 62)
  const n = first;
  const m = (n * (n - 1)) / 2;
  const neededChars = Math.ceil(m / 6);
  const data = s.slice(1);
  if (data.length < neededChars) throw new Error("graph6: not enough data");

  const bits: number[] = [];
  for (let i = 0; i < neededChars; i++) {
    const v = six2int(data[i]);
    for (let b = 5; b >= 0; b--) bits.push((v >> b) & 1);
  }
  const adj: Adj = Array.from({ length: n }, () => Array(n).fill(0));
  let idx = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      adj[i][j] = adj[j][i] = bits[idx++] ?? 0;
    }
  }
  return { n, adj };
}

export function toGraph6(adj: Adj): string {
  const n = adj.length;
  const m = (n * (n - 1)) / 2;
  const bits: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) bits.push(adj[i][j] ? 1 : 0);
  }
  while (bits.length % 6 !== 0) bits.push(0);
  let out = int2six(n);
  for (let i = 0; i < bits.length; i += 6) {
    let v = 0;
    for (let b = 0; b < 6; b++) v = (v << 1) | bits[i + b];
    out += int2six(v);
  }
  return out;
}

export function adjToEdges(adj: Adj): Edge[] {
  const n = adj.length;
  const edges: Edge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) if (adj[i][j]) edges.push([i, j]);
  }
  return edges;
}

export function cloneAdj(adj: Adj): Adj {
  return adj.map((row) => row.slice());
}
