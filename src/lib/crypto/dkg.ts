// src/lib/crypto/dkg.ts
import { ECPoint, G, ecAdd, ecLinComb, ecMul } from "./gost/ec";
import { q } from "./gost/ec";

function randBelow(modulus: bigint): bigint {
  let r = 0n;
  for (let i = 0; i < 6; i++) r = (r << 32n) + BigInt((Math.random() * 0xffffffff) >>> 0);
  return (r % (modulus - 1n)) + 1n;
}

export class DKGParticipant {
  readonly pid: number;
  readonly n: number;
  readonly t: number;
  private coeffs?: bigint[];
  commitments?: ECPoint[]; // C_k = a_k * G

  constructor(pid: number, n: number, t: number) { this.pid = pid; this.n = n; this.t = t; }

  round1_make_commitments(): ECPoint[] {
    this.coeffs = Array.from({ length: this.t }, () => randBelow(q));
    this.commitments = this.coeffs.map(a_k => ecMul(G, a_k));
    return this.commitments;
  }

  shareFor(i: number): bigint {
    if (!this.coeffs) throw new Error("coeffs?");
    let acc = 0n, pwr = 1n, x = BigInt(i) % q;
    for (const a_k of this.coeffs) { acc = (acc + a_k * pwr) % q; pwr = (pwr * x) % q; }
    return acc;
  }

  static verifyShare(i: number, s_ji: bigint, commitments_j: ECPoint[]): boolean {
    const left = ecMul(G, s_ji % q);
    const scalars: bigint[] = [];
    let pwr = 1n;
    for (let k = 0; k < commitments_j.length; k++) { scalars.push(pwr); pwr = (pwr * BigInt(i)) % q; }
    const right = ecLinComb(commitments_j, scalars);
    return left.x === right.x && left.y === right.y;
  }
}

export class DKGSession {
  readonly n: number; readonly t: number;
  readonly parties: DKGParticipant[];
  commitmentsAll: ECPoint[][] = [];
  finalShares: bigint[] = []; // i-1 -> s_i
  publicKeyQ?: ECPoint;

  constructor(n: number, t: number) {
    if (!(1 <= t && t <= n)) throw new Error("bad t");
    this.n = n; this.t = t;
    this.parties = Array.from({ length: n }, (_, i) => new DKGParticipant(i + 1, n, t));
  }

  run(): void {
    // 1) Коммитменты
    this.commitmentsAll = this.parties.map(p => p.round1_make_commitments());

    // 2) Рассылка и проверка долей
    const shares: bigint[][] = Array.from({ length: this.n }, () => Array(this.n).fill(0n));
    for (let j = 0; j < this.n; j++) {
      for (let i = 0; i < this.n; i++) {
        const s_ji = this.parties[j].shareFor(this.parties[i].pid);
        if (!DKGParticipant.verifyShare(this.parties[i].pid, s_ji, this.commitmentsAll[j]))
          throw new Error(`Complaint: share from ${j + 1} to ${i + 1}`);
        shares[j][i] = s_ji;
      }
    }

    // 3) Агрегация долей для каждого участника
    this.finalShares = Array.from({ length: this.n }, (_, i) =>
      shares.reduce((acc, row) => (acc + row[i]) % q, 0n)
    );

    // 4) Публичный ключ Q = sum_j C_j[0] (строго через сложение точек!)
    let Q: ECPoint = { x: null, y: null };
    for (const Cj of this.commitmentsAll) Q = ecAdd(Q, Cj[0]);
    this.publicKeyQ = Q;
  }

  verifyAggregatedShare(pid: number): boolean {
    if (!this.publicKeyQ) throw new Error("run() first");
    const s_i = this.finalShares[pid - 1];
    const left = ecMul(G, s_i);

    // right = sum_j (sum_k C_{j,k} * pid^k) — строго через ecLinComb
    let right: ECPoint = { x: null, y: null };
    for (const Cj of this.commitmentsAll) {
      const scalars: bigint[] = [];
      let pwr = 1n;
      for (let k = 0; k < this.t; k++) { scalars.push(pwr); pwr = (pwr * BigInt(pid)) % q; }
      right = ecAdd(right, ecLinComb(Cj, scalars));
    }
    return left.x === right.x && left.y === right.y;
  }

  getPublicKey(): ECPoint {
    if (!this.publicKeyQ) throw new Error("run() first");
    return this.publicKeyQ;
  }
}
