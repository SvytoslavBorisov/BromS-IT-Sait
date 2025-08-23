// src/lib/crypto/groups.ts
import { DKGParticipant } from "./dkg";
import { ECPoint, G, ecAdd, ecMul } from "./gost/ec";
import { lagrangeAtZero } from "./lagrange";
import { q } from "./gost/ec";
import { hashToCurvePoint } from "./gost/hash_to_curve";
import { bytesConcat } from "./bigint-utils";
import { H512 } from "./hmac_gost";

function randBelow(modulus: bigint): bigint {
  let r = 0n;
  for (let i = 0; i < 6; i++) r = (r << 32n) + BigInt((Math.random() * 0xffffffff) >>> 0);
  return (r % (modulus - 1n)) + 1n;
}

export type GroupPolicyConfig = {
  groups: Record<string, number[]>; // groupName -> PIDs
  outer_threshold: number;          // t_out
  inner_thresholds: Record<string, number>;
  veto_group?: string | null;
};

export class GroupDKG {
  readonly groupNames: string[];
  readonly m: number;
  readonly t_out: number;
  gidOf: Record<string, number> = {};
  parties: DKGParticipant[];
  commitmentsAll: ECPoint[][] = [];
  groupShares: Record<string, bigint> = {};

  constructor(groupNames: string[], t_out: number) {
    if (!(1 <= t_out && t_out <= groupNames.length)) throw new Error("bad t_out");
    this.groupNames = groupNames.slice();
    this.m = groupNames.length;
    this.t_out = t_out;
    this.gidOf = Object.fromEntries(groupNames.map((n, i) => [n, i + 1]));
    this.parties = Array.from({ length: this.m }, (_, i) => new DKGParticipant(i + 1, this.m, t_out));
  }

  run() {
    this.commitmentsAll = this.parties.map(p => p.round1_make_commitments());
    const shares: bigint[][] = Array.from({ length: this.m }, () => Array(this.m).fill(0n));
    for (let j = 0; j < this.m; j++) {
      for (let i = 0; i < this.m; i++) {
        const s_ji = this.parties[j].shareFor(i + 1);
        if (!DKGParticipant.verifyShare(i + 1, s_ji, this.commitmentsAll[j]))
          throw new Error(`Complaint group: ${j + 1} -> ${i + 1}`);
        shares[j][i] = s_ji;
      }
    }
    for (let i = 0; i < this.m; i++) {
      const name = this.groupNames[i];
      this.groupShares[name] = shares.reduce((acc, row) => (acc + row[i]) % q, 0n);
    }
  }
}

export class InternalGroupDKG {
  readonly groupName: string;
  readonly members: number[];
  readonly t_in: number;
  readonly y_g: bigint;
  private shares: Record<number, bigint> = {};

  constructor(groupName: string, members: number[], t_in: number, y_g: bigint) {
    if (!(1 <= t_in && t_in <= members.length)) throw new Error("bad t_in");
    this.groupName = groupName; this.members = members.slice(); this.t_in = t_in; this.y_g = y_g % q;
    const coeffs: bigint[] = [this.y_g, ...Array.from({ length: t_in - 1 }, () => randBelow(q))];
    for (const pid of this.members) {
      let acc = 0n, pwr = 1n, x = BigInt(pid) % q;
      for (const a of coeffs) { acc = (acc + a * pwr) % q; pwr = (pwr * x) % q; }
      this.shares[pid] = acc;
    }
  }

  aggregatePartialPoint(membersSubset: number[], lambdaOut: bigint, B: ECPoint): ECPoint {
    if (membersSubset.length < this.t_in) throw new Error(`[${this.groupName}] недостаточно участников`);
    const lamIn = lagrangeAtZero(membersSubset);
    let YB: ECPoint = { x: null, y: null };
    for (const pid of membersSubset) {
      const share = this.shares[pid];
      const scal = (lamIn[pid] * share) % q;
      YB = ecAdd(YB, ecMul(B, scal));
    }
    return ecMul(YB, lambdaOut % q);
  }
}

export function policyPointB(epoch: Uint8Array, j: number, aad: Uint8Array): ECPoint {
  return hashToCurvePoint(epoch, j, aad);
}
