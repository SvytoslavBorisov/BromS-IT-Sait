// src/types.ts
import type { Adj } from "./lib/graph6";
import type { Perm } from "./lib/perm";

export type Phase = "commit" | "challenge" | "response" | "verify";

export interface GIInstanceOptions {
  n: number;
  rounds: number;
  density: number;
  seed?: string;
  autoplay?: boolean;
}

export interface GIInstance {
  n: number;
  rounds: number;
  G1: Adj;
  G2: Adj;
  G1_graph6: string;
  G2_graph6: string;
  pi: Perm;
}

export interface ProtocolState {
  phase: Phase;
  round: number;
  H: Adj | null;
  sigma: Perm | null;
  responsePerm: Perm | null;
  b: 0 | 1 | null;
  accepted: boolean | null;
  stats: { accepted: number; rejected: number; completed: number };
}

export interface RoundEvent {
  type: "commit" | "challenge" | "response" | "verify" | "done";
  message: string;
}

export interface ProtocolEngine {
  next(): RoundEvent | null;
  getState(): ProtocolState;
}
