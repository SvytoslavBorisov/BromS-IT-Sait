// src/lib/crypto/scheme.ts
import { DKGSession } from "./dkg";
import { DealerlessPolicyViaDKG } from "./policy";
import { GroupDKG, GroupPolicyConfig, InternalGroupDKG, policyPointB } from "./groups";
import { ECPoint, ecAdd, pointSerialize } from "./gost/ec";
import { ThresholdECIES, ECIESCiphertext } from "./ecies_threshold";
import { H256, Hmac256, hkdfLike, streamXor } from "./hmac_gost";
import { bytesConcat } from "./bigint-utils";
import { lagrangeAtZero } from "./lagrange";

export class MyDealerlessScheme {
  readonly n: number; readonly t: number;
  readonly dkg: DKGSession;
  readonly policy: DealerlessPolicyViaDKG;
  readonly epoch: Uint8Array;

  groupCfg?: GroupPolicyConfig;
  groupDKG?: GroupDKG;
  internalGroups: Record<string, InternalGroupDKG> = {};

  constructor(opts: {
    n: number, t: number, epoch?: Uint8Array, veto_threshold?: number,
    group_weights?: Record<number, number>, veto_weights?: Record<number, number>, required_weight?: number
  }) {
    this.n = opts.n; this.t = opts.t;
    this.dkg = new DKGSession(this.n, this.t); this.dkg.run();
    this.epoch = opts.epoch ?? new TextEncoder().encode("2025Q3");
    this.policy = new DealerlessPolicyViaDKG({
      n: this.n, t: this.t, dkg: this.dkg, epoch: this.epoch,
      vetoThreshold: opts.veto_threshold ?? 1,
      groupWeights: opts.group_weights, vetoWeights: opts.veto_weights,
      requiredWeight: opts.required_weight
    });
  }

  // Прокси
  getPublicKeyQ() { return this.dkg.getPublicKey(); }
  verifyFinalShare(pid: number) { return this.dkg.verifyAggregatedShare(pid); }
  giveToken(pid: number, veto = false) { return this.policy.giveToken(pid, veto); }
  recoverKey(subset: [number, Uint8Array][], j = 0) { return this.policy.recoverKey(subset, j); }

  eciesEncrypt(plaintext: Uint8Array, aad: Uint8Array = new Uint8Array(0)): ECIESCiphertext {
    return new ThresholdECIES().encrypt(this.getPublicKeyQ(), plaintext, aad);
  }
  eciesPartial(pid: number, ct: ECIESCiphertext, S: number[]) {
    const s_i = this.dkg.finalShares[pid - 1];
    return ThresholdECIES.participantPartial(pid, s_i, ct.R, S);
  }
  eciesDecryptWithPartials(ct: ECIESCiphertext, partials: any[], aad: Uint8Array = new Uint8Array(0)) {
    return new ThresholdECIES().decryptWithPartials(ct, partials as any, aad);
  }

  // Группы + двойной замок
  initGroupPolicy(cfg: GroupPolicyConfig) {
    this.groupCfg = cfg;
    const names = Object.keys(cfg.groups);
    this.groupDKG = new GroupDKG(names, cfg.outer_threshold);
    this.groupDKG.run();
    this.internalGroups = {};
    for (const name of names) {
      const members = cfg.groups[name];
      const t_in = cfg.inner_thresholds[name] ?? 1;
      const y_g = this.groupDKG.groupShares[name];
      this.internalGroups[name] = new InternalGroupDKG(name, members, t_in, y_g);
    }
  }

  groupPartial(groupName: string, membersSubset: number[], participatingGroups: string[], j: number, aad: Uint8Array): any {
    if (!this.groupCfg || !this.groupDKG) throw new Error("initGroupPolicy()");
    if (!participatingGroups.includes(groupName)) throw new Error("groupName not in participatingGroups");
    const pairs = participatingGroups.map(n => [n, this.groupDKG!.gidOf[n]] as [string, number]).sort((a, b) => a[1] - b[1]);
    const gidsSorted = pairs.map(p => p[1]);
    const lamOut = lagrangeAtZero(gidsSorted);
    const lam = lamOut[this.groupDKG.gidOf[groupName]];
    const B = policyPointB(this.epoch, j, aad);
    return this.internalGroups[groupName].aggregatePartialPoint(membersSubset, lam, B);
  }

  combineGroups(PgList: any[], participatingGroups: string[]): any {
    if (this.groupCfg?.veto_group && !participatingGroups.includes(this.groupCfg.veto_group))
      throw new Error("Отсутствует обязательная (вето) группа");
    return PgList.reduce((acc, P) => ecAdd(acc, P), { x: null, y: null } as any);
  }

  // KDF для двойного замка: из двух точек -> (cek, k_mac)
  private static kdfDouble(zPoint: ECPoint, sPoint: ECPoint, aad: Uint8Array) {
    const seed = H256(bytesConcat(
      new TextEncoder().encode("DL-SEED"),
      pointSerialize(zPoint),
      pointSerialize(sPoint),
      aad
    ));
    const [okm1, okm2] = hkdfLike(seed, new TextEncoder().encode("DOUBLE-LOCK"), 2);
    const cek  = okm1.slice(0, 32);
    const kMac = okm2.slice(0, 32);
    return { cek, kMac };
  }
  deriveCEK(zPoint: any, sPoint: any, aad: Uint8Array = new Uint8Array(0)) {
    return MyDealerlessScheme.kdfDouble(zPoint, sPoint, aad);
  }

  // простая MAC и «стрим» на HMAC — для контейнера double-lock
  mac256(key: Uint8Array, data: Uint8Array) { return Hmac256(key, data); }
  streamEnc(key: Uint8Array, nonce: Uint8Array, data: Uint8Array) { return streamXor(key, nonce, data); }
}
