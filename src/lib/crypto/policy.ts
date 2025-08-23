// src/lib/crypto/policy.ts
import { DKGSession } from "./dkg";
import { H256 } from "./hmac_gost";
import { bytesConcat, u16be, u32be, bigintToBytes } from "./bigint-utils";
import { merkleLeaf, buildMerkle, merkleProof, merkleVerify } from "./merkle";
import { ECPoint } from "./gost/ec";

export class DealerlessPolicyViaDKG {
  readonly n: number; readonly t: number;
  readonly dkg: DKGSession;
  readonly epoch: Uint8Array;
  readonly vetoThreshold: number;
  readonly groupOf: Record<number, number> = {};
  readonly groupWeights: Record<number, number>;
  readonly vetoWeights: Record<number, number>;
  readonly requiredWeight: number;

  private tokenNo: Record<number, Uint8Array> = {};
  private tokenVeto: Record<number, Uint8Array> = {};
  private commitNo: Record<number, Uint8Array> = {};
  private commitVeto: Record<number, Uint8Array> = {};

  private merkleRoot!: Uint8Array;
  private merkleLevels!: Uint8Array[][];
  private leafIndex!: Record<string, number>;
  private leafOrder!: [number, "no" | "veto"][];

  constructor(opts: {
    n: number, t: number, dkg: DKGSession, epoch: Uint8Array,
    vetoThreshold: number, groupWeights?: Record<number, number>, vetoWeights?: Record<number, number>,
    requiredWeight?: number
  }) {
    this.n = opts.n; this.t = opts.t; this.dkg = opts.dkg;
    this.epoch = opts.epoch; this.vetoThreshold = opts.vetoThreshold;

    for (let pid = 1; pid <= this.n; pid++) this.groupOf[pid] = (pid - 1) % (this.t + 1);
    this.groupWeights = Object.assign(Object.fromEntries(Array.from({ length: this.t + 1 }, (_, i) => [i, 1])), opts.groupWeights || {});
    this.vetoWeights = Object.assign(Object.fromEntries(Array.from({ length: this.t + 1 }, (_, i) => [i, 1])), opts.vetoWeights || {});
    this.requiredWeight = opts.requiredWeight ?? (this.t + 1);

    for (let pid = 1; pid <= this.n; pid++) {
      const s_i = this.dkg.finalShares[pid - 1];
      const s_bytes = bigintToBytes(s_i);
      const token_no   = H256(bytesConcat(new TextEncoder().encode("no"),   this.epoch, u16be(pid), s_bytes));
      const token_veto = H256(bytesConcat(new TextEncoder().encode("veto"), this.epoch, u16be(pid), s_bytes));
      this.tokenNo[pid] = token_no; this.tokenVeto[pid] = token_veto;
      this.commitNo[pid]   = H256(token_no);
      this.commitVeto[pid] = H256(token_veto);
    }

    const leaves: Uint8Array[] = [];
    const order: [number, "no" | "veto"][] = [];
    for (let pid = 1; pid <= this.n; pid++) {
      const noLeaf   = merkleLeaf(pid, "no", this.commitNo[pid]);
      const vetoLeaf = merkleLeaf(pid, "veto", this.commitVeto[pid]);
      order.push([pid, "no"]);   leaves.push(noLeaf);
      order.push([pid, "veto"]); leaves.push(vetoLeaf);
    }
    const built = buildMerkle(leaves);
    this.merkleRoot = built.root;
    this.merkleLevels = built.levels;
    this.leafOrder = order;
    this.leafIndex = Object.fromEntries(order.map((v, i) => [v.join(":"), i]));
  }

  getMerkleRoot(): Uint8Array { return this.merkleRoot; }
  getMerkleProof(pid: number, kind: "no" | "veto") {
    const idx = this.leafIndex[`${pid}:${kind}`]; return merkleProof(this.merkleLevels, idx);
  }
  getPublicBundle(Q: ECPoint) {
    return {
      merkle_root: this.merkleRoot,
      commitments: Object.fromEntries(Array.from({ length: this.n }, (_, i) =>
        [i + 1, [this.commitNo[i + 1], this.commitVeto[i + 1]] as [Uint8Array, Uint8Array]])),
      leaf_order: this.leafOrder,
      policy: {
        epoch: this.epoch, required_weight: this.requiredWeight,
        veto_threshold: this.vetoThreshold,
        group_weights: this.groupWeights, veto_weights: this.vetoWeights,
      },
      dkg: { Q, threshold_t: this.t, participants_n: this.n }
    };
  }

  giveToken(pid: number, veto = false): Uint8Array {
    return veto ? this.tokenVeto[pid] : this.tokenNo[pid];
  }
  verifyToken(pid: number, token: Uint8Array): "no_veto" | "veto" | "invalid" {
    const h = H256(token);
    if (Buffer.from(h).toString("hex") === Buffer.from(this.commitNo[pid]).toString("hex")) return "no_veto";
    if (Buffer.from(h).toString("hex") === Buffer.from(this.commitVeto[pid]).toString("hex")) return "veto";
    return "invalid";
  }

  static verifyTokenViaMerkle(args: {
    merkle_root: Uint8Array, pid: number, token: Uint8Array, kind: "no" | "veto", proof: ReturnType<typeof merkleProof>
  }): boolean {
    const commit = H256(args.token);
    const leaf = merkleLeaf(args.pid, args.kind, commit);
    return merkleVerify(args.merkle_root, leaf, args.proof);
  }

  recoverKey(subset: [number, Uint8Array][], j = 0): Uint8Array {
    let vetoSum = 0;
    const gotGroups = new Set<number>();
    const tokensNo: [number, Uint8Array][] = [];
    for (const [pid, token] of subset) {
      const kind = this.verifyToken(pid, token);
      const gid = this.groupOf[pid];
      if (kind === "veto") vetoSum += 1;
      else if (!gotGroups.has(gid)) { gotGroups.add(gid); tokensNo.push([pid, token]); }
    }
    if (vetoSum >= this.vetoThreshold) throw new Error("Вето: доступ заблокирован");
    if (gotGroups.size < this.requiredWeight) throw new Error("Недостаточно положительных весов");

    const policyCtx = bytesConcat(
      new TextEncoder().encode("POLICY_CTX"),
      this.epoch, u32be(this.requiredWeight)
    );
    // Упрощённая «связка» (без Q для компактности демо)
    const bind = bytesConcat(new TextEncoder().encode("J"), u32be(j));
    const tokensSorted = tokensNo.sort((a, b) => a[0] - b[0]).map(x => x[1]);
    return H256(bytesConcat(new TextEncoder().encode("KJ:GOST3411-2012-512:WEIGHTED"),
      policyCtx, bind, ...tokensSorted));
  }
}
