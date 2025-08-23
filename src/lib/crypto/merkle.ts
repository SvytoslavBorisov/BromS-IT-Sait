// src/lib/crypto/merkle.ts
import { H512 } from "./hmac_gost";
import { bytesConcat, u16be } from "./bigint-utils";

const LEAF = new TextEncoder().encode("MERKLE:LEAF:GOST3411-2012-512");
const NODE = new TextEncoder().encode("MERKLE:NODE:GOST3411-2012-512");

export function merkleLeaf(pid: number, kind: "no" | "veto", commit: Uint8Array): Uint8Array {
  const kindByte = new Uint8Array([kind === "no" ? 0 : 1]);
  return H512(bytesConcat(LEAF, u16be(pid), kindByte, commit));
}
export function merkleParent(left: Uint8Array, right: Uint8Array): Uint8Array {
  return H512(bytesConcat(NODE, left, right));
}

export function buildMerkle(leaves: Uint8Array[]): { root: Uint8Array, levels: Uint8Array[][] } {
  if (!leaves.length) throw new Error("No leaves");
  const levels: Uint8Array[][] = [leaves.slice()];
  let cur = leaves.slice();
  while (cur.length > 1) {
    const nxt: Uint8Array[] = [];
    for (let i = 0; i < cur.length; i += 2) {
      const L = cur[i], R = i + 1 < cur.length ? cur[i + 1] : cur[i];
      nxt.push(merkleParent(L, R));
    }
    levels.push(nxt); cur = nxt;
  }
  return { root: cur[0], levels };
}

export type Proof = { sib: Uint8Array, dir: "L" | "R" }[];
export function merkleProof(levels: Uint8Array[][], leafIndex: number): Proof {
  const proof: Proof = [];
  let idx = leafIndex;
  for (let lvl = 0; lvl < levels.length - 1; lvl++) {
    const nodes = levels[lvl];
    if (idx % 2 === 0) {
      const sibIdx = idx + 1 < nodes.length ? idx + 1 : idx;
      proof.push({ sib: nodes[sibIdx], dir: "R" });
    } else {
      proof.push({ sib: nodes[idx - 1], dir: "L" });
    }
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export function merkleVerify(root: Uint8Array, leaf: Uint8Array, proof: Proof): boolean {
  let acc = leaf;
  for (const { sib, dir } of proof) {
    acc = dir === "R" ? merkleParent(acc, sib) : merkleParent(sib, acc);
  }
  return Buffer.from(acc).toString("hex") === Buffer.from(root).toString("hex");
}
